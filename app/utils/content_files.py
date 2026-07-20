"""生成详情页 HTML、市场报告等静态文件（写入 uploads 目录）。"""
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
) -> str:
    """生成商品详情页 HTML，返回完整 URL。"""
    out_dir = settings.upload_dir / "generated"
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"detail_{task_id}.html"
    path = out_dir / filename

    desc = description or "优质商品，欢迎选购。"
    main_content = body_html or f"<h1>{product_name}</h1><p>{desc}</p>"
    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>{product_name}</title>
  <style>
    body {{ font-family: sans-serif; max-width: 750px; margin: 0 auto; padding: 24px; color: #333; }}
    h1 {{ color: #1677ff; }}
    .tag {{ display: inline-block; background: #e6f4ff; color: #1677ff; padding: 4px 12px; border-radius: 4px; font-size: 14px; }}
  </style>
</head>
<body>
  <span class="tag">风格：{style}</span>
  {main_content}
  <p><small>由全链路电商智能系统生成 · task {task_id}</small></p>
</body>
</html>"""
    path.write_text(html, encoding="utf-8")
    return _public_url(f"generated/{filename}")


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
