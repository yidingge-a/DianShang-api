"""图像处理服务：经典 Pillow 精修 + 视觉大模型（白底/瑕疵/裁剪主体）。"""
from __future__ import annotations

import time
import uuid
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

from app.config import get_settings
from app.core.exceptions import AppException
from app.services import vision_client

settings = get_settings()

# 与 goods-images Skill 一致的电商主体/白底约束
_VLM_PRODUCT_PRESERVE = (
    "HARD RULE: keep the product appearance EXACTLY the same as the input photo "
    "(shape, color, material, logo, pattern, texture). Do NOT redesign or invent a different product."
)

PROMPT_WHITE_BG = (
    "E-commerce PRODUCT main image on pure white background (#FFFFFF). "
    f"{_VLM_PRODUCT_PRESERVE} "
    "SUBJECT CROP (same idea as Skill goods-images add_overlay cover-crop): "
    "scale to FILL a square catalog canvas, then center-crop so the product subject fills the frame "
    "with minimal empty margin; product must stay fully visible and centered. "
    "Remove cluttered background / props not on the product; replace background with clean studio white. "
    "Soft even lighting, high resolution, no text, no watermark, no QR, no logo overlay. "
    "Output a professional Taobao/Tmall white-background catalog photo (carousel white-bg style)."
)

PROMPT_DEFECT_REPAIR = (
    "Professional e-commerce product photo RETOUCH / blemish repair (瑕疵修复). "
    f"{_VLM_PRODUCT_PRESERVE} "
    "Remove scratches, stains, dust, wrinkles, spots, glare defects and surface blemishes on the product. "
    "Keep natural material look; do not over-smooth into plastic; do not change product design. "
    "Prefer keeping the original composition; only fix defects. "
    "High resolution, catalog quality, no text, no watermark."
)

PROMPT_AUTO_CROP = (
    "Tightly crop this image to the MAIN PRODUCT SUBJECT only. "
    f"{_VLM_PRODUCT_PRESERVE} "
    "Use Skill goods-images subject framing: cover-fill then center-crop to a clean square catalog frame; "
    "remove excess empty margins and background clutter while keeping the full product in frame. "
    "Do not redesign the product or invent a new background. No text, no watermark."
)


def _open_image(path: Path) -> Image.Image:
    if not path.is_file():
        raise AppException("图片文件不存在", 404)
    return Image.open(path).convert("RGBA" if path.suffix.lower() == ".png" else "RGB")


def _save_result(img: Image.Image, ext: str = ".jpg") -> tuple[str, str]:
    """保存处理结果，返回 (file_id, url)。"""
    buf_path = settings.upload_dir / "processed"
    buf_path.mkdir(parents=True, exist_ok=True)
    file_id = str(uuid.uuid4())
    dest = buf_path / f"{file_id}{ext}"
    fmt = "PNG" if ext == ".png" else "JPEG"
    if fmt == "JPEG" and img.mode == "RGBA":
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        img = bg
    img.save(dest, format=fmt, quality=90)
    url = f"{settings.base_url.rstrip('/')}/uploads/processed/{dest.name}"
    return file_id, url


def _local_auto_crop(source: Path) -> dict:
    """Skill goods-images 同款 cover-fill 居中裁方图（本地回退）。"""
    img = _open_image(source)
    canvas = 1024
    ratio = max(canvas / img.width, canvas / img.height)
    img = img.resize((max(1, int(img.width * ratio)), max(1, int(img.height * ratio))), Image.Resampling.LANCZOS)
    left = max(0, (img.width - canvas) // 2)
    top = max(0, (img.height - canvas) // 2)
    img = img.crop((left, top, left + canvas, top + canvas))
    file_id, url = _save_result(img.convert("RGB"))
    return {
        "status": "completed",
        "result_url": url,
        "file_id": file_id,
        "used_vlm": False,
        "data_source": "local_cover_crop",
        "fallback": True,
    }


def _local_white_bg(source: Path) -> dict:
    """本地白底：尽量抠主体，失败则整图铺白底。"""
    from io import BytesIO

    png_bytes = vision_client.segment_foreground(source)
    if png_bytes:
        img = Image.open(BytesIO(png_bytes)).convert("RGBA")
    else:
        img = _open_image(source).convert("RGBA")
    # cover crop 到方图再铺白
    canvas = 1024
    ratio = max(canvas / img.width, canvas / img.height)
    img = img.resize((max(1, int(img.width * ratio)), max(1, int(img.height * ratio))), Image.Resampling.LANCZOS)
    left = max(0, (img.width - canvas) // 2)
    top = max(0, (img.height - canvas) // 2)
    img = img.crop((left, top, left + canvas, top + canvas))
    bg = Image.new("RGBA", (canvas, canvas), (255, 255, 255, 255))
    if img.mode == "RGBA":
        bg.paste(img, (0, 0), img.split()[3])
    else:
        bg.paste(img.convert("RGB"), (0, 0))
    file_id, url = _save_result(bg.convert("RGB"))
    return {
        "status": "completed",
        "result_url": url,
        "file_id": file_id,
        "used_vlm": False,
        "data_source": "local_white_bg",
        "fallback": True,
    }


def _local_defect_repair(source: Path) -> dict:
    img = _open_image(source).filter(ImageFilter.SMOOTH_MORE)
    file_id, url = _save_result(img)
    return {
        "status": "completed",
        "result_url": url,
        "file_id": file_id,
        "used_vlm": False,
        "data_source": "local_smooth",
        "fallback": True,
    }


def _vlm_edit(source: Path, prompt: str, *, filename_prefix: str, fallback: str | None = None) -> dict:
    """用 GPT 图生图编辑原图；网关 504 时按 fallback 做本地兜底。"""
    from app.services import gpt_image_client
    import logging

    log = logging.getLogger(__name__)

    if gpt_image_client.is_configured():
        try:
            # 1K + sync：避免 async 404 空耗，并降低 2K 导致的网关 504
            gen = gpt_image_client.generate_images(
                prompt,
                n=1,
                size="1K",
                reference_image_paths=[source],
                filename_prefix=filename_prefix,
                aspect_ratio="1:1",
                model=gpt_image_client.MODEL_GPT_IMAGE,
                prefer_sync=True,
                prompt_mode="product",
                quality="medium",
            )
            return {
                "status": "completed",
                "result_url": gen["result_url"],
                "file_id": gen.get("file_id") or (gen.get("results") or [{}])[0].get("file_id"),
                "local_path": gen.get("local_path"),
                "data_source": gen.get("data_source") or "kuaipao_gpt_image",
                "used_vlm": True,
            }
        except Exception as exc:
            log.warning("VLM 修图失败，尝试本地回退(%s): %s", fallback, str(exc)[:240])

    if fallback == "auto_crop":
        return _local_auto_crop(source)
    if fallback == "white_background":
        return _local_white_bg(source)
    if fallback == "remove_defects":
        return _local_defect_repair(source)
    raise AppException("视觉大模型修图失败，且无可用本地回退", 502)


def optimize_image(
    source: Path,
    optimize_type: str | None,
    intensity: float,
    options: dict,
) -> dict:
    """产品图精修。

    - feature_set=classic：Pillow 调色/亮度/锐化/智能精修
    - feature_set=vlm：白底 / 瑕疵修复 / 自动裁剪（视觉大模型）
    """
    start = time.time()
    options = options or {}
    feature_set = (options.get("feature_set") or "").strip().lower()
    vlm_action = (options.get("vlm_action") or "").strip()

    # 兼容旧字段：勾选了白底/瑕疵/裁剪则走 VLM 集
    if not feature_set:
        if options.get("white_background") or options.get("remove_defects") or options.get("auto_crop"):
            feature_set = "vlm"
            if options.get("white_background"):
                vlm_action = "white_background"
            elif options.get("remove_defects"):
                vlm_action = "remove_defects"
            else:
                vlm_action = "auto_crop"
        else:
            feature_set = "classic"

    if feature_set == "vlm":
        action = vlm_action or "white_background"
        if action == "white_background":
            result = _vlm_edit(source, PROMPT_WHITE_BG, filename_prefix="whitebg", fallback="white_background")
        elif action in ("remove_defects", "defect_repair", "repair"):
            result = _vlm_edit(source, PROMPT_DEFECT_REPAIR, filename_prefix="defectfix", fallback="remove_defects")
        elif action in ("auto_crop", "crop"):
            result = _vlm_edit(source, PROMPT_AUTO_CROP, filename_prefix="autocrop", fallback="auto_crop")
        else:
            raise AppException(f"不支持的 VLM 操作: {action}", 400)
        result["processing_time"] = round(time.time() - start, 2)
        result["feature_set"] = "vlm"
        result["vlm_action"] = action
        result["optimize_type"] = None
        return result

    # ---- classic Pillow ----
    img = _open_image(source)
    ot = (optimize_type or "all").strip() or "all"
    intensity = max(0.0, min(float(intensity or 0.7), 1.0))

    if ot in ("retouch", "all"):
        img = ImageEnhance.Contrast(img).enhance(1.0 + 0.25 * intensity)
        img = ImageEnhance.Color(img).enhance(1.0 + 0.35 * intensity)
        img = ImageEnhance.Sharpness(img).enhance(1.0 + 0.4 * intensity)
        if intensity >= 0.6:
            img = img.filter(ImageFilter.SMOOTH)
    if ot in ("color", "all") and ot != "retouch":
        img = ImageEnhance.Color(img).enhance(1.0 + 0.5 * intensity)
    if ot in ("brightness", "all") and ot != "retouch":
        img = ImageEnhance.Brightness(img).enhance(1.0 + 0.3 * intensity)
    if ot in ("sharpen", "all") and ot != "retouch":
        img = ImageEnhance.Sharpness(img).enhance(1.0 + intensity)

    _, url = _save_result(img)
    return {
        "status": "completed",
        "result_url": url,
        "processing_time": round(time.time() - start, 2),
        "feature_set": "classic",
        "optimize_type": ot,
        "used_vlm": False,
    }


def remove_background(source: Path, background_type: str, bg_color: str, output_format: str) -> dict:
    """抠图 / 白底：优先视觉大模型白底 prompt，否则本地分割回退。"""
    start = time.time()
    # 优先走与「白底效果」相同的 VLM 路径
    try:
        from app.services import gpt_image_client
        if gpt_image_client.is_configured():
            result = _vlm_edit(source, PROMPT_WHITE_BG, filename_prefix="rmbg_white", fallback="white_background")
            result["processing_time"] = round(time.time() - start, 2)
            return result
    except Exception:
        pass

    png_bytes = vision_client.segment_foreground(source)
    if png_bytes:
        from io import BytesIO

        img = Image.open(BytesIO(png_bytes)).convert("RGBA")
    else:
        img = _open_image(source).convert("RGBA")
        w, h = img.size
        mask = Image.new("L", (w, h), 0)
        draw = ImageDraw.Draw(mask)
        margin = int(min(w, h) * 0.08)
        draw.ellipse((margin, margin, w - margin, h - margin), fill=255)
        img.putalpha(mask)

    w, h = img.size
    if background_type == "white":
        bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        img = bg
    elif background_type == "color":
        c = bg_color.lstrip("#")
        rgb = tuple(int(c[i : i + 2], 16) for i in (0, 2, 4))
        bg = Image.new("RGBA", img.size, (*rgb, 255))
        bg.paste(img, mask=img.split()[3])
        img = bg

    ext = ".png" if output_format == "png" else ".jpg"
    _, url = _save_result(img, ext)
    return {
        "status": "completed",
        "result_url": url,
        "result_width": w,
        "result_height": h,
        "processing_time": round(time.time() - start, 2),
    }


def repair_image(source: Path, auto_detect: bool = True) -> dict:
    """瑕疵修复：优先视觉大模型，否则平滑滤镜回退。"""
    start = time.time()
    try:
        from app.services import gpt_image_client
        if gpt_image_client.is_configured():
            result = _vlm_edit(source, PROMPT_DEFECT_REPAIR, filename_prefix="repair", fallback="remove_defects")
            result["processing_time"] = round(time.time() - start, 2)
            return result
    except Exception:
        pass

    img = _open_image(source)
    if auto_detect:
        img = img.filter(ImageFilter.SMOOTH_MORE)
    _, url = _save_result(img)
    return {
        "status": "completed",
        "result_url": url,
        "processing_time": round(time.time() - start, 2),
        "used_vlm": False,
    }


def batch_process(sources: list[Path], process_type: str, params: dict) -> list[dict]:
    results = []
    for src in sources:
        try:
            img = _open_image(src)
            if process_type == "resize":
                img = img.resize((params.get("width", 800), params.get("height", 800)))
            elif process_type == "format":
                pass
            elif process_type == "optimize":
                img = ImageEnhance.Contrast(img).enhance(1.1)
            _, url = _save_result(img, f".{params.get('format', 'jpg')}")
            results.append({"image_id": src.stem, "result_url": url, "status": "success"})
        except Exception as exc:
            results.append({"image_id": src.stem, "status": "failed", "reason": str(exc)})
    return results


def merge_images(sources: list[Path], merge_mode: str, output_size: dict | None) -> dict:
    images = [_open_image(p) for p in sources[:2]]
    if merge_mode == "horizontal":
        total_w = sum(i.width for i in images)
        max_h = max(i.height for i in images)
        canvas = Image.new("RGB", (total_w, max_h), (255, 255, 255))
        x = 0
        for im in images:
            canvas.paste(im.convert("RGB"), (x, 0))
            x += im.width
    elif merge_mode == "vertical":
        max_w = max(i.width for i in images)
        total_h = sum(i.height for i in images)
        canvas = Image.new("RGB", (max_w, total_h), (255, 255, 255))
        y = 0
        for im in images:
            canvas.paste(im.convert("RGB"), (0, y))
            y += im.height
    else:
        canvas = images[0].convert("RGBA")
        canvas.paste(images[1].convert("RGBA"), (100, 100), images[1].convert("RGBA"))

    if output_size:
        canvas = canvas.resize((output_size["width"], output_size["height"]))
    _, url = _save_result(canvas.convert("RGB"))
    return {"result_url": url}


def add_elements(source: Path, elements: list[dict]) -> dict:
    img = _open_image(source).convert("RGBA")
    draw = ImageDraw.Draw(img)
    for el in elements:
        if el.get("type") == "text":
            pos = el.get("position", {"x": 10, "y": 10})
            draw.text((pos["x"], pos["y"]), el.get("content", ""), fill=el.get("color", "#FFFFFF"))
    _, url = _save_result(img)
    return {"result_url": url}


def crop_resize(source: Path, width: int, height: int, crop_box: dict | None) -> dict:
    img = _open_image(source)
    if crop_box:
        img = img.crop((crop_box["x"], crop_box["y"], crop_box["x"] + crop_box["width"], crop_box["y"] + crop_box["height"]))
    img = img.resize((width, height))
    _, url = _save_result(img)
    return {"result_url": url, "width": width, "height": height}


def apply_crop_operation(source: Path, operation: str, size: tuple[int, int] = (800, 800)) -> dict:
    """裁剪/缩放：operation = resize | crop | fit。自动裁剪优先 VLM。"""
    if operation == "crop":
        try:
            from app.services import gpt_image_client
            if gpt_image_client.is_configured():
                return _vlm_edit(source, PROMPT_AUTO_CROP, filename_prefix="cropop", fallback="auto_crop")
        except Exception:
            pass
        img = _open_image(source)
        box = img.getbbox() or (0, 0, img.width, img.height)
        img = img.crop(box)
        _, url = _save_result(img)
        return {"result_url": url, "width": img.width, "height": img.height}
    img = _open_image(source)
    if operation == "fit":
        img.thumbnail(size, Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", size, (255, 255, 255))
        offset = ((size[0] - img.width) // 2, (size[1] - img.height) // 2)
        canvas.paste(img.convert("RGB"), offset)
        _, url = _save_result(canvas)
        return {"result_url": url, "width": size[0], "height": size[1]}
    img = img.resize(size)
    _, url = _save_result(img)
    return {"result_url": url, "width": size[0], "height": size[1]}
