"""图像处理服务（Pillow 实现，可替换为云端视觉 API）。"""
import time
import uuid
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

from app.config import get_settings
from app.core.exceptions import AppException
from app.services import vision_client

settings = get_settings()


def _open_image(path: Path) -> Image.Image:
    if not path.is_file():
        raise AppException("图片文件不存在", 404)
    return Image.open(path).convert("RGBA" if path.suffix.lower() == ".png" else "RGB")


def _save_result(img: Image.Image, ext: str = ".jpg") -> tuple[str, str]:
    """保存处理结果，返回 (file_id, url)。"""
    from app.utils.file_storage import save_upload_file

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


def optimize_image(
    source: Path,
    optimize_type: str,
    intensity: float,
    options: dict,
) -> dict:
    """产品图精修：调色、亮度、锐化等。"""
    start = time.time()
    img = _open_image(source)

    if optimize_type in ("color", "all"):
        img = ImageEnhance.Color(img).enhance(1.0 + 0.5 * intensity)
    if optimize_type in ("brightness", "all"):
        img = ImageEnhance.Brightness(img).enhance(1.0 + 0.3 * intensity)
    if optimize_type in ("sharpen", "all"):
        img = ImageEnhance.Sharpness(img).enhance(1.0 + intensity)
    if options.get("remove_defects"):
        img = img.filter(ImageFilter.SMOOTH_MORE)
    if options.get("white_background"):
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
        bg.paste(img, (0, 0), img if img.mode == "RGBA" else None)
        img = bg.convert("RGB")
    if options.get("auto_crop"):
        img = img.crop(img.getbbox() or (0, 0, img.width, img.height))

    _, url = _save_result(img)
    return {
        "status": "completed",
        "result_url": url,
        "processing_time": round(time.time() - start, 2),
    }


def remove_background(source: Path, background_type: str, bg_color: str, output_format: str) -> dict:
    """抠图 / 白底：优先视觉模型，否则 Pillow 椭圆蒙版。"""
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
    }


def repair_image(source: Path, auto_detect: bool) -> dict:
    """瑕疵修复：平滑滤镜模拟。"""
    img = _open_image(source)
    if auto_detect:
        img = img.filter(ImageFilter.SMOOTH_MORE)
    _, url = _save_result(img)
    return {"status": "completed", "result_url": url}


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
    """裁剪/缩放：operation = resize | crop | fit。"""
    img = _open_image(source)
    if operation == "crop":
        box = img.getbbox() or (0, 0, img.width, img.height)
        img = img.crop(box)
        _, url = _save_result(img)
        return {"result_url": url, "width": img.width, "height": img.height}
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


def generate_poster(event_title: str, colors: list[str], size: dict) -> dict:
    """生成简单活动海报。"""
    w, h = size.get("width", 1080), size.get("height", 1920)
    bg_color = colors[0] if colors else "#FF0000"
    c = bg_color.lstrip("#")
    rgb = tuple(int(c[i : i + 2], 16) for i in (0, 2, 4))
    img = Image.new("RGB", (w, h), rgb)
    draw = ImageDraw.Draw(img)
    draw.text((w // 10, h // 3), event_title, fill=colors[1] if len(colors) > 1 else "#FFFFFF")
    _, url = _save_result(img)
    return {"result_url": url, "width": w, "height": h}
