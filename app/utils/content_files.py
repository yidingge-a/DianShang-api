"""生成详情页 HTML、市场报告等静态文件（写入 uploads 目录）。"""
from __future__ import annotations

import zipfile
from pathlib import Path

from app.config import get_settings

settings = get_settings()


def _public_url(rel_path: str) -> str:
    """磁盘相对路径 → 浏览器可访问 URL。"""
    return f"{settings.base_url.rstrip('/')}/uploads/{rel_path.lstrip('/')}"


def write_detail_page_html(
    task_id: str,
    product_name: str,
    description: str,
    style: str,
    *,
    body_html: str | None = None,
    section_images: list[dict] | None = None,
) -> str:
    """生成商品详情页 HTML，返回完整 URL。section_images: [{title, url}]。"""
    out_dir = settings.upload_dir / "generated"
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"detail_{task_id}.html"
    path = out_dir / filename

    desc = description or "优质商品，欢迎选购。"
    images_html = ""
    if section_images:
        blocks = []
        for i, item in enumerate(section_images):
            title = item.get("title") or f"详情 {i + 1}"
            url = item.get("url") or ""
            if not url:
                continue
            blocks.append(
                f'<section class="panel">'
                f'<h2>{title}</h2>'
                f'<img src="{url}" alt="{title}" />'
                f"</section>"
            )
        images_html = "\n".join(blocks)

    main_content = body_html or f"<h1>{product_name}</h1><p>{desc}</p>"
    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{product_name} - 详情页</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      max-width: 750px; margin: 0 auto; padding: 16px; color: #222; background: #f7f7f7; }}
    .tag {{ display: inline-block; background: #e6f4ff; color: #1677ff;
      padding: 4px 12px; border-radius: 4px; font-size: 13px; margin-bottom: 12px; }}
    .intro {{ background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 16px; }}
    .panel {{ background: #fff; border-radius: 12px; padding: 12px; margin-bottom: 16px; }}
    .panel h2 {{ font-size: 16px; margin: 0 0 10px; }}
    .panel img {{ width: 100%; height: auto; display: block; border-radius: 8px; }}
    footer {{ color: #999; font-size: 12px; text-align: center; margin-top: 24px; }}
  </style>
</head>
<body>
  <span class="tag">风格：{style}</span>
  <div class="intro">
    {main_content}
  </div>
  {images_html}
  <footer>由全链路电商智能系统生成 · task {task_id}</footer>
</body>
</html>"""
    path.write_text(html, encoding="utf-8")
    return _public_url(f"generated/{filename}")


def write_detail_images_zip(
    task_id: str,
    items: list[Path] | list[tuple[Path, str]],
) -> str | None:
    """
    把「生成的详情页 PNG」打成 zip。
    items: [Path, ...] 或 [(Path, title), ...]
    压缩包内命名：01_首屏主视觉.png …
    """
    normalized: list[tuple[Path, str]] = []
    for i, item in enumerate(items or []):
        if isinstance(item, tuple) and len(item) >= 1:
            p = Path(item[0])
            title = str(item[1]) if len(item) > 1 else f"详情屏{i + 1}"
        else:
            p = Path(item)
            title = f"详情屏{i + 1}"
        if p.is_file():
            normalized.append((p, title))
    if not normalized:
        return None

    out_dir = settings.upload_dir / "generated"
    out_dir.mkdir(parents=True, exist_ok=True)
    zip_name = f"detail_{task_id}_pages.zip"
    zip_path = out_dir / zip_name

    def _safe_name(text: str) -> str:
        keep = "".join(c if c.isalnum() or c in "-_（）() " else "_" for c in text)
        return keep.strip().replace(" ", "_")[:40] or "page"

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for i, (p, title) in enumerate(normalized):
            # 强制以 .png 扩展名进入压缩包
            arc = f"{i + 1:02d}_{_safe_name(title)}.png"
            # 若源不是 png，仍按字节写入但扩展名用 png（下载侧已统一转 png）
            zf.write(p, arcname=arc)
    return _public_url(f"generated/{zip_name}")



def write_market_report_html(
    task_id: str, keyword: str, summary: dict, analysis_text: str = ""
) -> str:
    """生成市场分析报告 HTML，返回完整 URL。"""
    out_dir = settings.upload_dir / "reports"
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"report_{task_id}.html"
    path = out_dir / filename

    heat = summary.get("market_heat", "-")
    growth = summary.get("estimated_growth_rate", "-")
    extra = f"<section><p>{analysis_text}</p></section>" if analysis_text else ""
    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8" /><title>市场报告 - {keyword}</title></head>
<body style="font-family:sans-serif;max-width:800px;margin:24px auto;">
  <h1>「{keyword}」市场分析报告</h1>
  <p>市场热度：{heat} · 预估增长率：{growth}%</p>
  {extra}
  <p><small>报告 ID：{task_id}</small></p>
</body>
</html>"""
    path.write_text(html, encoding="utf-8")
    return _public_url(f"reports/{filename}")


def write_listing_page_html(
    *,
    publish_id: str,
    product_id: str,
    platform: str,
    title: str,
    price: float,
    description: str,
    selling_points: list[str],
    image_ids: list[str],
) -> str:
    """生成平台上架预览页（智能铺货模式下的真实可访问链接）。"""
    out_dir = settings.upload_dir / "listings"
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"listing_{product_id}_{platform}_{publish_id[:8]}.html"
    path = out_dir / filename

    points_html = "".join(f"<li>{p}</li>" for p in selling_points[:5])
    platform_names = {"taobao": "淘宝", "tmall": "天猫", "jd": "京东", "pdd": "拼多多", "douyin": "抖音"}
    platform_label = platform_names.get(platform, platform)

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>{title} - {platform_label}</title>
  <style>
    body {{ font-family: sans-serif; max-width: 750px; margin: 0 auto; padding: 24px; }}
    .price {{ color: #e4393c; font-size: 28px; font-weight: bold; }}
    .platform {{ background: #1677ff; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 13px; }}
    ul {{ line-height: 1.8; }}
  </style>
</head>
<body>
  <span class="platform">{platform_label} 上架页</span>
  <h1>{title}</h1>
  <p class="price">¥{price:.2f}</p>
  <p>{description}</p>
  <ul>{points_html}</ul>
  <p><small>商品 ID：{product_id} · 上架任务：{publish_id}</small></p>
</body>
</html>"""
    path.write_text(html, encoding="utf-8")
    return _public_url(f"listings/{filename}")
