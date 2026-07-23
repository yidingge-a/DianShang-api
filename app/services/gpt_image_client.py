"""Kuaipao OpenAI 兼容生图：gpt-image-2（厂商异步提交 + 轮询）。

- 提交：POST /v1/images/generations/async
- 查询：GET  /v1/images/generations/async/{taskId}
- 有产品参考图时：请求体 image 传 data-url / base64（替代同步 /edits）
"""
from __future__ import annotations

import base64
import logging
import mimetypes
import time
import uuid
from io import BytesIO
from pathlib import Path

import httpx
from PIL import Image

from app.config import get_settings
from app.core.exceptions import AppException

logger = logging.getLogger(__name__)

MODEL_GPT_IMAGE = "gpt-image-2"

# 异步任务终态
_DONE = {"completed", "succeeded"}
_FAIL = {"failed", "cancelled"}


def is_configured() -> bool:
    return bool(get_settings().openai_api_key.strip())


def _api_base() -> str:
    settings = get_settings()
    base = (settings.openai_base_url or "https://kuaipao.ai/v1").rstrip("/")
    if base.endswith("/v1"):
        return base
    return f"{base}/v1"


def _size_for(aspect_ratio: str, size: str) -> str:
    ratio = (aspect_ratio or "3:4").strip()
    want_2k = str(size or "").upper() in ("2K", "2048", "2k")
    table = {
        "1:1": ("1024x1024", "2048x2048"),
        "16:9": ("1536x1024", "2048x1152"),
        "9:16": ("1024x1536", "2160x3840"),
        "3:4": ("1024x1536", "1536x2048"),
        "4:3": ("1536x1024", "2048x1536"),
        "2:3": ("1024x1536", "1536x2048"),
        "3:2": ("1536x1024", "2048x1536"),
    }
    low, high = table.get(ratio, ("1024x1536", "1536x2048"))
    return high if want_2k else low


def _save_png(raw: bytes, *, filename_prefix: str = "") -> tuple[str, str, Path]:
    settings = get_settings()
    dest_dir = settings.upload_dir / "processed"
    dest_dir.mkdir(parents=True, exist_ok=True)
    file_id = str(uuid.uuid4())
    prefix = f"{filename_prefix}_" if filename_prefix else ""
    dest = dest_dir / f"{prefix}{file_id}.png"
    img = Image.open(BytesIO(raw))
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGBA")
    else:
        img = img.convert("RGB")
    img.save(dest, format="PNG", optimize=True)
    url = f"{settings.base_url.rstrip('/')}/uploads/processed/{dest.name}"
    return file_id, url, dest


def _file_to_data_url(path: Path) -> str:
    mime = mimetypes.guess_type(str(path))[0] or "image/png"
    raw = path.read_bytes()
    b64 = base64.b64encode(raw).decode("ascii")
    return f"data:{mime};base64,{b64}"


def _parse_response_items(payload: dict) -> list[dict]:
    items = payload.get("data") if isinstance(payload, dict) else None
    if not items:
        raise AppException(f"gpt-image-2 未返回图片: {str(payload)[:300]}", 502)
    return [i for i in items if isinstance(i, dict)]


def _items_to_results(items: list[dict], *, filename_prefix: str) -> list[dict]:
    results = []
    for i, item in enumerate(items):
        b64 = item.get("b64_json") or item.get("b64")
        remote = item.get("url")
        prefix = filename_prefix if len(items) == 1 else f"{filename_prefix}{i + 1:02d}"
        if b64:
            raw = base64.b64decode(b64)
            file_id, local_url, local_path = _save_png(raw, filename_prefix=prefix)
        elif remote:
            with httpx.Client(timeout=120.0, follow_redirects=True) as client:
                r = client.get(remote)
                r.raise_for_status()
                file_id, local_url, local_path = _save_png(r.content, filename_prefix=prefix)
        else:
            continue
        results.append({
            "file_id": file_id,
            "result_url": local_url,
            "local_path": str(local_path),
        })
    if not results:
        raise AppException("gpt-image-2 返回中无可解码图片", 502)
    return results


def _extract_task_id(payload: dict) -> str | None:
    if not isinstance(payload, dict):
        return None
    for key in ("id", "task_id", "taskId"):
        val = payload.get(key)
        if val:
            return str(val)
    # 嵌套
    data = payload.get("data")
    if isinstance(data, dict):
        for key in ("id", "task_id", "taskId"):
            val = data.get(key)
            if val:
                return str(val)
    return None


def _auth_headers(api_key: str) -> dict:
    return {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def submit_async_generation(
    *,
    api_key: str,
    model_name: str,
    prompt: str,
    out_size: str,
    n: int = 1,
    reference_paths: list[Path] | None = None,
    quality: str = "high",
) -> tuple[str, dict]:
    """提交异步生图，返回 (task_id, payload)。task_id 为空表示已直接返回图片。"""
    url = f"{_api_base()}/images/generations/async"
    body: dict = {
        "model": model_name,
        "prompt": prompt,
        "n": max(1, min(int(n or 1), 4)),
        "size": out_size,
        "quality": quality,
        "response_format": "url",
    }
    refs = [Path(p) for p in (reference_paths or []) if p and Path(p).is_file()]
    if refs:
        # 厂商异步接口：image 为 URL / base64 / data-url 数组
        body["image"] = [_file_to_data_url(p) for p in refs[:3]]
        body["prompt"] = (
            "You are creating ecommerce DETAIL PAGE module images. "
            "HARD RULE: keep the product appearance EXACTLY the same as the reference photo "
            "(shape, color, material, logo, pattern). Do NOT redesign or invent a different product. "
            "Only change layout/background/copy areas for a Taobao detail-page panel. "
            f"Task: {prompt}"
        )

    logger.info(
        "Kuaipao async submit model=%s size=%s refs=%s",
        model_name, out_size, len(refs),
    )
    with httpx.Client(timeout=60.0) as client:
        resp = client.post(url, json=body, headers=_auth_headers(api_key))
        if resp.status_code >= 400:
            raise AppException(
                f"gpt-image-2 异步提交失败 HTTP {resp.status_code}: {resp.text[:500]}",
                502,
            )
        payload = resp.json()

    task_id = _extract_task_id(payload)
    # 兼容：部分网关直接返回同步结果
    if not task_id and isinstance(payload.get("data"), list) and payload["data"]:
        return "", payload
    if not task_id:
        raise AppException(f"异步生图未返回 task_id: {str(payload)[:300]}", 502)
    return task_id, payload


def poll_async_generation(
    *,
    api_key: str,
    task_id: str,
    timeout_seconds: float = 300.0,
    interval_seconds: float = 2.0,
) -> dict:
    """轮询异步任务直到完成/失败/超时，返回最终 JSON。"""
    url = f"{_api_base()}/images/generations/async/{task_id}"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }
    deadline = time.time() + max(30.0, float(timeout_seconds))
    last_status = ""
    with httpx.Client(timeout=30.0) as client:
        while time.time() < deadline:
            resp = client.get(url, headers=headers)
            if resp.status_code == 404:
                raise AppException(f"异步生图任务不存在: {task_id}", 502)
            if resp.status_code >= 400:
                raise AppException(
                    f"异步生图查询失败 HTTP {resp.status_code}: {resp.text[:500]}",
                    502,
                )
            payload = resp.json()
            status = str(payload.get("status") or "").lower()
            progress = payload.get("progress")
            if status != last_status:
                logger.info("Kuaipao async poll task=%s status=%s progress=%s", task_id, status, progress)
                last_status = status

            if status in _DONE:
                data = payload.get("data") or []
                if not data:
                    raise AppException(f"异步生图已完成但无图片数据: {task_id}", 502)
                return payload
            if status in _FAIL:
                err = payload.get("error") or {}
                msg = err.get("message") if isinstance(err, dict) else str(err)
                raise AppException(f"异步生图失败: {msg or status}", 502)

            # queued / processing / in_progress / 空
            time.sleep(max(0.5, float(interval_seconds)))

    raise AppException(f"异步生图超时（>{int(timeout_seconds)}s）task={task_id}", 504)



def _generate_sync_text_only(
    *,
    api_key: str,
    model_name: str,
    prompt: str,
    out_size: str,
    n: int,
    filename_prefix: str,
) -> list[dict]:
    """同步文生图回退（网关未开通 async 时使用）。"""
    url = f"{_api_base()}/images/generations"
    body = {
        "model": model_name,
        "prompt": prompt,
        "size": out_size,
        "n": n,
        "quality": "high",
        "output_format": "png",
        "response_format": "url",
    }
    with httpx.Client(timeout=180.0) as client:
        resp = client.post(url, json=body, headers=_auth_headers(api_key))
        if resp.status_code >= 400:
            raise AppException(
                f"gpt-image-2 同步出图失败 HTTP {resp.status_code}: {resp.text[:500]}",
                502,
            )
        payload = resp.json()
    return _items_to_results(_parse_response_items(payload), filename_prefix=filename_prefix)


def _prepare_edit_ref(path: Path, *, max_side: int = 1536) -> Path:
    """缩小过大参考图，降低 Kuaipao /edits 网关 504 概率。"""
    settings = get_settings()
    p = Path(path)
    try:
        img = Image.open(p)
        w, h = img.size
        if max(w, h) <= max_side:
            return p
        scale = max_side / float(max(w, h))
        nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
        img = img.resize((nw, nh), Image.Resampling.LANCZOS)
        tmp_dir = settings.upload_dir / "processed" / "_edit_refs"
        tmp_dir.mkdir(parents=True, exist_ok=True)
        dest = tmp_dir / f"{p.stem}_r{max_side}{p.suffix or '.png'}"
        fmt = "PNG" if dest.suffix.lower() == ".png" else "JPEG"
        if fmt == "JPEG" and img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.save(dest, format=fmt, quality=92)
        return dest
    except Exception:
        return p


def _generate_sync_with_edits(
    *,
    api_key: str,
    model_name: str,
    prompt: str,
    out_size: str,
    reference_paths: list[Path],
    filename_prefix: str,
    prompt_mode: str = "detail",
    quality: str = "high",
    timeout: float = 300.0,
    max_retries: int = 2,
) -> list[dict]:
    """同步图生图回退。

    prompt_mode:
      - detail: 详情页保真包装（默认）
      - product: 原样 prompt，用于白底/瑕疵/裁剪等产品图编辑
    """
    import mimetypes as _mt
    import time as _time

    url = f"{_api_base()}/images/edits"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }
    if (prompt_mode or "detail").strip().lower() == "product":
        final_prompt = (
            "HARD RULE: keep the product appearance EXACTLY the same as the reference photo "
            "(shape, color, material, logo, pattern, texture). Do NOT invent a different product. "
            f"{prompt}"
        )
    else:
        final_prompt = (
            "You are editing ecommerce DETAIL PAGE module images. "
            "HARD RULE: keep the product appearance EXACTLY the same as the reference photo "
            "(shape, color, material, logo, pattern). Do NOT redesign or invent a different product. "
            "Only change layout/background/copy areas for a Taobao detail-page panel. "
            f"Task: {prompt}"
        )

    prepared = [_prepare_edit_ref(Path(p)) for p in reference_paths[:3] if p]
    last_err: Exception | None = None
    sizes_to_try = [out_size]
    # 504 时自动降到 1K 方图再试
    if out_size not in ("1024x1024", "1024x1536", "1536x1024"):
        sizes_to_try.append("1024x1024")

    for attempt, size in enumerate(sizes_to_try[: max(1, max_retries)]):
        files = []
        file_handles = []
        try:
            for p in prepared:
                if not Path(p).is_file():
                    continue
                mime = _mt.guess_type(str(p))[0] or "image/png"
                fh = Path(p).open("rb")
                file_handles.append(fh)
                files.append(("image", (Path(p).name, fh, mime)))
            if not files:
                raise AppException("参考图文件不存在", 400)
            data = {
                "model": model_name,
                "prompt": final_prompt,
                "size": size,
                "n": "1",
                "quality": quality or "high",
                "output_format": "png",
            }
            logger.info(
                "Kuaipao sync edits attempt=%s size=%s quality=%s refs=%s",
                attempt + 1,
                size,
                quality,
                len(files),
            )
            with httpx.Client(timeout=float(timeout)) as client:
                resp = client.post(url, headers=headers, data=data, files=files)
                if resp.status_code in (502, 503, 504):
                    last_err = AppException(
                        f"gpt-image-2 同步图生图失败 HTTP {resp.status_code}: {resp.text[:300]}",
                        502,
                    )
                    logger.warning("edits 网关超时/不可用，将重试: %s", last_err)
                    _time.sleep(1.5)
                    continue
                if resp.status_code >= 400:
                    raise AppException(
                        f"gpt-image-2 同步图生图失败 HTTP {resp.status_code}: {resp.text[:500]}",
                        502,
                    )
                payload = resp.json()
            return _items_to_results(_parse_response_items(payload), filename_prefix=filename_prefix)
        finally:
            for fh in file_handles:
                try:
                    fh.close()
                except Exception:
                    pass

    if last_err:
        raise last_err
    raise AppException("gpt-image-2 同步图生图失败", 502)


def generate_images(
    prompt: str,
    *,
    n: int = 1,
    size: str = "2K",
    reference_image_paths: list[Path] | None = None,
    enable_sequential: bool = False,  # noqa: ARG001
    filename_prefix: str = "",
    aspect_ratio: str = "3:4",
    model: str | None = None,
    prefer_sync: bool = False,
    prompt_mode: str = "detail",
    quality: str = "high",
) -> dict:
    settings = get_settings()
    api_key = settings.openai_api_key.strip()
    if not api_key:
        raise AppException("未配置 OPENAI_API_KEY，无法使用 gpt-image-2", 503)

    model_name = (model or MODEL_GPT_IMAGE).strip() or MODEL_GPT_IMAGE
    n = max(1, min(int(n or 1), 4))
    out_size = _size_for(aspect_ratio, size)
    refs = [Path(p) for p in (reference_image_paths or []) if p and Path(p).is_file()]
    used_async = False

    def _sync_fallback() -> list[dict]:
        if refs:
            all_results: list[dict] = []
            for i in range(n):
                prefix = filename_prefix if n == 1 else f"{filename_prefix}{i + 1:02d}"
                part = prompt if n == 1 else f"{prompt}\n(Image {i + 1} of {n})"
                all_results.extend(
                    _generate_sync_with_edits(
                        api_key=api_key,
                        model_name=model_name,
                        prompt=part,
                        out_size=out_size,
                        reference_paths=refs,
                        filename_prefix=prefix,
                        prompt_mode=prompt_mode,
                        quality=quality,
                    )
                )
            return all_results
        return _generate_sync_text_only(
            api_key=api_key,
            model_name=model_name,
            prompt=prompt,
            out_size=out_size,
            n=n,
            filename_prefix=filename_prefix,
        )

    try:
        if prefer_sync:
            logger.info("prefer_sync=True，跳过 async，直接同步生图 size=%s", out_size)
            results = _sync_fallback()
        else:
            try:
                task_id, submit_payload = submit_async_generation(
                    api_key=api_key,
                    model_name=model_name,
                    prompt=prompt,
                    out_size=out_size,
                    n=n,
                    reference_paths=refs or None,
                )
                if task_id:
                    final_payload = poll_async_generation(api_key=api_key, task_id=task_id)
                else:
                    final_payload = submit_payload
                results = _items_to_results(
                    _parse_response_items(final_payload),
                    filename_prefix=filename_prefix,
                )
                used_async = True
            except AppException as async_exc:
                msg = str(async_exc)
                # 网关未开通 async（常见 404 Invalid URL）时回退同步，保证业务可用
                if "异步提交失败 HTTP 404" in msg or "Invalid URL" in msg or "未返回 task_id" in msg:
                    logger.warning("Kuaipao async 不可用，回退同步生图: %s", msg[:200])
                    results = _sync_fallback()
                else:
                    raise
    except AppException:
        raise
    except Exception as exc:
        raise AppException(f"gpt-image-2 请求异常: {exc}", 502) from exc

    return {
        "status": "completed",
        "model": model_name,
        "count": len(results),
        "result_url": results[0]["result_url"],
        "local_path": results[0]["local_path"],
        "results": results,
        "data_source": "kuaipao_gpt_image_async" if used_async else "kuaipao_gpt_image",
        "used_reference": bool(refs),
        "async": used_async,
    }
