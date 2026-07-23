"""智能美工模块业务（字段与前端 v2 文档对齐）。"""
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.exceptions import AppException
from app.models.user import User
from app.services import image_service, task_service
from app.services.ai_service import ai_service
from app.services.upload_service import get_user_file
from app.services import video_service
from app.utils.content_files import write_detail_page_html

settings = get_settings()

TEMPLATES = [
    {"template_id": "tpl-001", "name": "简约白底", "type": "poster", "category": "promotional"},
    {"template_id": "tpl-002", "name": "618 大促", "type": "poster", "category": "promotional"},
    {"template_id": "tpl-003", "name": "现代详情页", "type": "detail", "category": "modern"},
]


def _file_path(db: Session, user_id: str, image_id: str) -> Path:
    record = get_user_file(db, user_id, image_id)
    return Path(record.file_path)


def _optimize_options(body: dict) -> dict:
    """前端扁平字段 white_background 等，兼容旧版嵌套 options。"""
    opts = dict(body.get("options") or {})
    for key in ("white_background", "remove_defects", "auto_crop", "feature_set", "vlm_action"):
        if key in body and body[key] is not None:
            opts[key] = body[key]
    return opts


def _resolve_optimize_task_type(body: dict, options: dict) -> str:
    """按功能写入不同 task_type，便于历史分类（每功能最多 10 条）。"""
    feature_set = (options.get("feature_set") or body.get("feature_set") or "").strip().lower()
    vlm_action = (options.get("vlm_action") or body.get("vlm_action") or "").strip()
    if not feature_set:
        if options.get("white_background") or body.get("white_background"):
            feature_set, vlm_action = "vlm", "white_background"
        elif options.get("remove_defects") or body.get("remove_defects"):
            feature_set, vlm_action = "vlm", "remove_defects"
        elif options.get("auto_crop") or body.get("auto_crop"):
            feature_set, vlm_action = "vlm", "auto_crop"
        else:
            feature_set = "classic"
    if feature_set == "vlm":
        mapping = {
            "white_background": "image_white_bg",
            "remove_defects": "image_defect_repair",
            "defect_repair": "image_defect_repair",
            "auto_crop": "image_auto_crop",
            "crop": "image_auto_crop",
        }
        return mapping.get(vlm_action or "white_background", "image_white_bg")
    return "image_optimize"


def _run_image_job_async(task_id: str, job_name: str, runner) -> None:
    """后台线程执行长耗时修图（VLM 常 40–120s），避免 HTTP 被前端 30s 超时掐断。"""
    import logging
    import threading

    def _wrap() -> None:
        from app.database import SessionLocal

        session = SessionLocal()
        try:
            runner(session)
        except Exception as exc:
            logging.getLogger(__name__).exception("%s 后台任务异常: %s", job_name, exc)
            try:
                t = task_service.get_task_by_id(session, task_id)
                if t and t.status == "processing":
                    task_service.fail_task(session, t, str(exc))
            except Exception:
                pass
        finally:
            session.close()

    threading.Thread(target=_wrap, daemon=True, name=f"{job_name}-{task_id[:8]}").start()


def optimize(db: Session, user: User, body: dict) -> dict:
    """提交图片优化任务：立即返回 task_id，后台跑经典精修 / VLM，前端轮询。"""
    path = _file_path(db, user.user_id, body["image_id"])
    options = _optimize_options(body)
    task_type = _resolve_optimize_task_type(body, options)
    task = task_service.create_task(db, user.user_id, task_type, body)
    task_service.update_progress(db, task, 8, message="任务已提交，正在处理…")

    task_id = task.task_id
    user_id = user.user_id
    image_id = body["image_id"]
    path_str = str(path)
    optimize_type = body.get("optimize_type")
    intensity = body.get("intensity", 0.7)
    options_copy = dict(options)

    def _job(session: Session) -> None:
        t = task_service.get_task_by_id(session, task_id)
        if not t:
            return
        task_service.update_progress(session, t, 20, message="正在调用图像处理…")
        result = image_service.optimize_image(
            Path(path_str),
            optimize_type,
            intensity,
            options_copy,
        )
        original_url = get_user_file(session, user_id, image_id).file_url
        task_service.complete_task(session, t, {"original_url": original_url, **result})

    _run_image_job_async(task_id, "image-optimize", _job)
    return task_service.task_to_dict(task)


def background_remove(db: Session, user: User, body: dict) -> dict:
    path = _file_path(db, user.user_id, body["image_id"])
    task = task_service.create_task(db, user.user_id, "background_remove", body)
    task_service.update_progress(db, task, 8, message="抠图任务已提交…")

    task_id = task.task_id
    path_str = str(path)
    bg_type = body.get("background_type", "white")
    bg_color = body.get("background_color", "#FFFFFF")
    out_fmt = body.get("output_format", "png")

    def _job(session: Session) -> None:
        t = task_service.get_task_by_id(session, task_id)
        if not t:
            return
        task_service.update_progress(session, t, 25, message="视觉大模型处理中…")
        result = image_service.remove_background(Path(path_str), bg_type, bg_color, out_fmt)
        task_service.complete_task(session, t, result)

    _run_image_job_async(task_id, "bg-remove", _job)
    return task_service.task_to_dict(task)


def repair(db: Session, user: User, body: dict) -> dict:
    path = _file_path(db, user.user_id, body["image_id"])
    task = task_service.create_task(db, user.user_id, "image_repair", body)
    task_service.update_progress(db, task, 8, message="瑕疵修复任务已提交…")

    task_id = task.task_id
    path_str = str(path)
    auto_detect = body.get("auto_detect", True)

    def _job(session: Session) -> None:
        t = task_service.get_task_by_id(session, task_id)
        if not t:
            return
        task_service.update_progress(session, t, 25, message="视觉大模型修复中…")
        result = image_service.repair_image(Path(path_str), auto_detect)
        task_service.complete_task(session, t, result)

    _run_image_job_async(task_id, "image-repair", _job)
    return task_service.task_to_dict(task)


def batch_images(db: Session, user: User, body: dict) -> dict:
    paths = [_file_path(db, user.user_id, iid) for iid in body.get("image_ids", [])]
    results = image_service.batch_process(paths, body.get("process_type", "resize"), body.get("params", {}))
    return {
        "batch_task_id": task_service.create_task(db, user.user_id, "image_batch", body).task_id,
        "total": len(paths),
        "processed": sum(1 for r in results if r.get("status") == "success"),
        "failed": sum(1 for r in results if r.get("status") != "success"),
        "results": results,
    }


def generate_detail_page(db: Session, user: User, body: dict) -> dict:
    """提交详情页生成任务（异步）：立即返回 task_id，前端轮询进度。"""
    import threading

    product_name = (body.get("product_name") or "").strip()
    product_description = (body.get("product_description") or body.get("description") or "").strip()
    image_ids = list(body.get("product_images") or body.get("image_ids") or [])
    if body.get("image_id"):
        image_ids.insert(0, body["image_id"])
    image_ids = [str(i).strip() for i in image_ids if i]

    if not product_name and not product_description and not image_ids:
        raise AppException("请上传产品图，或填写产品名称/描述", 400)
    from app.services import image_gen_router
    # 前端已去掉模型选择：默认固定 GPT
    image_model = image_gen_router.ensure_model_configured(
        body.get("image_model") or body.get("model") or image_gen_router.MODEL_GPT_IMAGE
    )
    body = {**body, "image_model": image_model}

    task = task_service.create_task(db, user.user_id, "detail_page", body)
    task_service.update_progress(
        db,
        task,
        5,
        message="任务已创建，准备识图与策划…",
        partial={"pages_total": int(body.get("section_count") or body.get("pages_count") or 9), "pages_done": 0, "preview_images": []},
    )

    task_id = task.task_id
    user_id = user.user_id
    body_copy = dict(body)

    def _runner() -> None:
        from app.database import SessionLocal

        session = SessionLocal()
        try:
            _execute_detail_page_job(session, task_id, user_id, body_copy)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).exception("详情页后台任务异常: %s", exc)
            try:
                t = task_service.get_task_by_id(session, task_id)
                if t and t.status == "processing":
                    task_service.fail_task(session, t, str(exc))
            except Exception:
                pass
        finally:
            session.close()

    threading.Thread(target=_runner, daemon=True, name=f"detail-page-{task_id[:8]}").start()
    return task_service.task_to_dict(task)


def _execute_detail_page_job(db: Session, task_id: str, user_id: str, body: dict) -> None:
    """后台逐屏出图，并在每张完成后更新进度。"""
    from app.services import image_gen_router, vision_client
    from app.utils.content_files import write_detail_images_zip

    image_model = image_gen_router.normalize_model(body.get("image_model") or body.get("model"))

    task = task_service.get_task_by_id(db, task_id)
    if not task:
        return

    product_name = (body.get("product_name") or "").strip()
    # 用户卖点：可空；有值时为主，识图卖点为辅
    product_description = str(
        body.get("product_description")
        if "product_description" in body
        else (body.get("selling_points") if "selling_points" in body else body.get("description") or "")
        or ""
    ).strip()
    user_selling_points = str(body.get("selling_points") or product_description or "").strip()
    selling_points = user_selling_points
    style = (body.get("style") or "modern").strip() or "modern"
    style_label = (body.get("style_label") or "").strip()
    section_count = int(body.get("section_count") or body.get("pages_count") or 9)
    section_count = max(4, min(section_count, 9))

    image_ids = list(body.get("product_images") or body.get("image_ids") or [])
    if body.get("image_id"):
        image_ids.insert(0, body["image_id"])
    image_ids = [str(i).strip() for i in image_ids if i]

    vision_parse = None
    vision_hint = ""
    vision_selling_points = ""
    ref_paths: list[Path] = []
    for iid in image_ids[:3]:
        try:
            ref_paths.append(_file_path(db, user_id, iid))
        except Exception:
            continue

    task_service.update_progress(
        db, task, 10,
        message="正在识图分析商品…" if ref_paths else "跳过识图，直接策划分屏…",
        partial={"pages_total": section_count, "pages_done": 0, "preview_images": []},
    )

    if ref_paths and vision_client.is_vision_configured():
        vision_parse = vision_client.parse_product_image_for_bom(ref_paths[0])
        if vision_parse:
            vision_hint = str(vision_parse)
            if not product_name:
                product_name = (
                    vision_parse.get("product_name")
                    or vision_parse.get("name")
                    or vision_parse.get("title")
                    or ""
                ).strip()
            comps = vision_parse.get("visible_components") or vision_parse.get("components") or []
            mats = vision_parse.get("visible_materials") or []
            parts = [
                vision_parse.get("description") or vision_parse.get("raw_text") or "",
                vision_parse.get("product_specs") or "",
                "材质：" + "、".join(mats) if mats else "",
                "部件：" + "、".join(comps) if isinstance(comps, list) and comps else "",
            ]
            vision_selling_points = "；".join(p for p in parts if p).strip()
            if vision_selling_points:
                if not user_selling_points:
                    # 用户留空：识图卖点强行填入为主
                    product_description = vision_selling_points
                    selling_points = vision_selling_points
                else:
                    # 用户已填：用户为主，识图为辅
                    selling_points = user_selling_points
                    product_description = user_selling_points

    if not product_name:
        product_name = "智能生成商品"

    task = task_service.get_task_by_id(db, task_id)
    task_service.update_progress(
        db, task, 20,
        message="正在按 Skill 策划详情分屏…",
        partial={"product_name": product_name, "pages_total": section_count, "pages_done": 0},
    )

    try:
        sections_plan = ai_service.plan_detail_page_sections(
            product_name,
            selling_points or product_description,
            style,
            section_count=section_count,
            vision_hint=vision_hint[:1500],
            style_label=style_label,
            skill="goods-images",
            vision_selling_points=vision_selling_points if user_selling_points else "",
            selling_points_primary=bool(user_selling_points),
        )
    except Exception as exc:
        task_service.fail_task(db, task, f"分屏策划失败：{exc}")
        return

    # 硬性：前端选 N 屏就必须正好 N 屏（规划不足则补齐）
    default_titles = [
        "主图封面", "核心卖点一", "核心卖点二", "核心卖点三",
        "细节标注", "使用场景", "规格参数", "尺码参考", "售后保障",
    ]
    while len(sections_plan) < section_count:
        i = len(sections_plan)
        t = default_titles[min(i, len(default_titles) - 1)]
        if i >= len(default_titles):
            t = f"详情屏{i + 1}"
        sections_plan.append({
            "title": t,
            "prompt": ai_service._default_detail_panel_prompt(
                product_name, product_description, t, style, i
            ),
            "module": t,
        })
    sections_plan = sections_plan[:section_count]
    total = section_count
    preview_images: list[str] = []
    section_images: list[dict] = []
    zip_items: list[tuple[Path, str]] = []
    gen_errors: list[str] = []

    use_ref = True if "use_product_reference" not in body else bool(body.get("use_product_reference"))
    refs = ref_paths[:1] if use_ref and ref_paths else None

    task = task_service.get_task_by_id(db, task_id)
    task_service.update_progress(
        db, task, 25,
        message=f"开始逐屏出图（{image_model}，共 {total} 屏）…",
        partial={
            "product_name": product_name,
            "pages_total": total,
            "pages_done": 0,
            "preview_images": [],
            "sections": [],
        },
    )

    # 可选顺序出图：整批完成再更新（无法逐张），默认关闭
    enable_sequential = bool(body.get("enable_sequential")) and image_model == image_gen_router.MODEL_WAN
    sequential_ok = False
    if enable_sequential:
        try:
            task = task_service.get_task_by_id(db, task_id)
            task_service.update_progress(db, task, 30, message="顺序批量出图中…")
            seq_prompt = ai_service.build_sequential_detail_prompt(
                product_name, product_description, style, sections_plan, vision_hint=vision_hint[:800],
            )
            gen = image_gen_router.generate_images(
                seq_prompt,
                model=image_model,
                n=len(sections_plan),
                size=body.get("size") or "2K",
                reference_image_paths=refs,
                enable_sequential=True,
                filename_prefix="detailpage",
                aspect_ratio="3:4",
            )
            results = gen.get("results") or []
            if len(results) < len(sections_plan):
                raise AppException(f"顺序出图数量不足：期望 {len(sections_plan)}，实际 {len(results)}", 502)
            for idx, sec in enumerate(sections_plan):
                title = sec.get("title") or f"详情屏{idx + 1}"
                item = results[idx]
                local = Path(item["local_path"])
                url = item["result_url"]
                if not local.is_file():
                    raise AppException(f"{title} 本地 PNG 缺失", 502)
                preview_images.append(url)
                zip_items.append((local, title))
                section_images.append({
                    "title": title, "url": url, "prompt": sec.get("prompt"), "file_id": item.get("file_id"),
                })
                progress = 25 + int((idx + 1) / total * 65)
                task = task_service.get_task_by_id(db, task_id)
                task_service.update_progress(
                    db, task, progress,
                    message=f"已生成 {idx + 1}/{total}：{title}",
                    partial={
                        "pages_total": total,
                        "pages_done": idx + 1,
                        "preview_images": list(preview_images),
                        "sections": list(section_images),
                        "current_title": title,
                    },
                )
            sequential_ok = True
        except Exception as exc:
            gen_errors.append(f"顺序出图失败，改逐屏：{exc}")
            import logging
            logging.getLogger(__name__).warning("详情页顺序出图失败: %s", exc)
            preview_images.clear()
            section_images.clear()
            zip_items.clear()

    if not sequential_ok:
        import logging
        import time

        logger = logging.getLogger(__name__)
        max_retries = 3
        for idx, sec in enumerate(sections_plan):
            title = sec.get("title") or f"详情屏{idx + 1}"
            prompt = sec.get("prompt") or ai_service._default_detail_panel_prompt(
                product_name, product_description, title, style, idx
            )
            task = task_service.get_task_by_id(db, task_id)
            task_service.update_progress(
                db, task, 25 + int(idx / total * 65),
                message=f"正在生成第 {idx + 1}/{total} 屏：{title}",
                partial={
                    "pages_total": total,
                    "pages_done": len(preview_images),
                    "preview_images": list(preview_images),
                    "sections": list(section_images),
                    "current_title": title,
                },
            )
            url = ""
            local = None
            last_err = ""
            for attempt in range(1, max_retries + 1):
                panel_refs = list(refs or [])
                if image_model == image_gen_router.MODEL_GPT_IMAGE and zip_items:
                    panel_refs = list(refs or []) + [zip_items[0][0]]
                try:
                    if attempt > 1:
                        task = task_service.get_task_by_id(db, task_id)
                        task_service.update_progress(
                            db, task, 25 + int(idx / total * 65),
                            message=f"第 {idx + 1}/{total} 屏重试 {attempt}/{max_retries}：{title}",
                            partial={
                                "pages_total": total,
                                "pages_done": len(preview_images),
                                "preview_images": list(preview_images),
                                "sections": list(section_images),
                                "current_title": title,
                            },
                        )
                        time.sleep(1.5)
                    gen = image_gen_router.generate_images(
                        prompt,
                        model=image_model,
                        n=1,
                        size=body.get("size") or "2K",
                        reference_image_paths=panel_refs or None,
                        filename_prefix=f"detailpage{idx + 1:02d}",
                        aspect_ratio="3:4",
                    )
                    url = gen.get("result_url") or ""
                    local = Path(gen["local_path"]) if gen.get("local_path") else None
                    if not url or not local or not local.is_file():
                        raise AppException(f"{title} 出图后未保存到本地 PNG", 502)
                    preview_images.append(url)
                    zip_items.append((local, title))
                    section_images.append({
                        "title": title,
                        "url": url,
                        "prompt": prompt,
                        "file_id": gen.get("file_id") or (gen.get("results") or [{}])[0].get("file_id"),
                    })
                    last_err = ""
                    break
                except Exception as exc:
                    last_err = str(exc)
                    logger.warning("详情屏出图失败 %s attempt=%s: %s", title, attempt, exc)

            if last_err or not url:
                gen_errors.append(f"{title}: {last_err or '未知错误'}")
                # 选了 N 屏就必须凑满：失败则整单失败，禁止少屏交差
                msg = f"第 {idx + 1}/{total} 屏「{title}」生成失败（已重试 {max_retries} 次）：{last_err}"
                task = task_service.get_task_by_id(db, task_id)
                task_service.fail_task(db, task, msg)
                return

            done = len(preview_images)
            progress = 25 + int(done / total * 65)
            task = task_service.get_task_by_id(db, task_id)
            task_service.update_progress(
                db, task, progress,
                message=f"已生成 {done}/{total}：{title}",
                partial={
                    "pages_total": total,
                    "pages_done": done,
                    "preview_images": list(preview_images),
                    "sections": list(section_images),
                    "current_title": title,
                },
            )

    if len(zip_items) < total:
        msg = (
            f"出图数量不足：期望 {total} 屏，实际 {len(zip_items)} 屏。"
            + ("；".join(gen_errors[:3]) if gen_errors else "")
        )
        task = task_service.get_task_by_id(db, task_id)
        task_service.fail_task(db, task, msg)
        return

    task = task_service.get_task_by_id(db, task_id)
    task_service.update_progress(db, task, 92, message="正在打包 HTML / ZIP…", partial={
        "pages_total": total,
        "pages_done": len(preview_images),
        "preview_images": list(preview_images),
        "sections": list(section_images),
    })

    body_html = ai_service.generate_detail_html_body(
        product_name, product_description, style, sections_plan
    ) or f"<h1>{product_name}</h1><p>{product_description or '优质好物，欢迎选购。'}</p>"

    html_url = write_detail_page_html(
        task.task_id,
        product_name,
        product_description,
        style,
        body_html=body_html,
        section_images=section_images,
    )
    zip_url = write_detail_images_zip(task.task_id, zip_items)
    if not zip_url:
        task_service.fail_task(db, task, "详情页 PNG 打包失败")
        return

    result = {
        "status": "completed",
        "product_name": product_name,
        "product_description": product_description,
        "html_url": html_url,
        "download_zip_url": zip_url,
        "preview_images": preview_images,
        "pages_count": len(section_images),
        "pages_total": total,
        "pages_done": len(section_images),
        "sections": section_images,
        "vision_parse": vision_parse,
        "data_source": ("kuaipao_gpt_image" if image_model == image_gen_router.MODEL_GPT_IMAGE else "dashscope_wan"),
        "skill": "goods-images",
        "style": style,
        "style_label": style_label,
        "selling_points": selling_points,
        "vision_selling_points": vision_selling_points or None,
        "image_model": image_model,
        "used_product_reference": bool(refs),
        "warnings": gen_errors[:5] or None,
        "message": "详情页生成完成",
        "result": {
            "html_url": html_url,
            "download_zip_url": zip_url,
            "preview_images": preview_images,
            "pages_count": len(section_images),
        },
    }
    task = task_service.get_task_by_id(db, task_id)
    task_service.complete_task(db, task, result)



def generate_video(db: Session, user: User, body: dict) -> dict:
    task = task_service.create_task(db, user.user_id, "video_generate", body)
    task_service.complete_task(db, task, {
        "status": "processing",
        "progress": 0,
        "result_url": "",
        "estimated_time": 60,
    })
    if settings.celery_enabled:
        from app.tasks.worker_tasks import run_video_task
        run_video_task.delay(task.task_id, user.user_id)
    data = task_service.task_to_dict(task)
    data["status"] = "processing"
    return data


def generate_poster(db: Session, user: User, body: dict) -> dict:
    task = task_service.create_task(db, user.user_id, "poster", body)
    title = body.get("event_title", "活动")
    # 优先万相出图；失败再回退 Pillow 色块海报
    from app.services import dashscope_image_client

    if dashscope_image_client.is_configured():
        try:
            prompt = body.get("prompt") or (
                f"电商促销海报，主题「{title}」，竖版构图，醒目标题，干净电商风格，高清"
            )
            result = dashscope_image_client.generate_images(
                prompt,
                n=1,
                size=body.get("size", "2K"),
            )
            task_service.complete_task(db, task, result)
            return task_service.task_to_dict(task)
        except Exception:
            pass
    result = image_service.generate_poster(
        title,
        body.get("colors", ["#FF0000", "#FFFFFF"]),
        body.get("output_size", {"width": 1080, "height": 1920}),
    )
    task_service.complete_task(db, task, result)
    return task_service.task_to_dict(task)


def generate_ai_image(db: Session, user: User, body: dict) -> dict:
    """文生图 / 图生图（万相或 Gemini，可带 reference image_id）。"""
    from app.services import image_gen_router

    task = task_service.create_task(db, user.user_id, "ai_image_generate", body)
    prompt = (body.get("prompt") or body.get("text") or "").strip()
    if not prompt:
        raise AppException("请提供 prompt 文案", 400)

    image_model = image_gen_router.ensure_model_configured(
        body.get("image_model") or body.get("model")
    )

    refs: list[Path] = []
    for key in ("image_id", "reference_image_id"):
        iid = (body.get(key) or "").strip()
        if iid:
            refs.append(_file_path(db, user.user_id, iid))
    for iid in body.get("image_ids") or []:
        if iid:
            refs.append(_file_path(db, user.user_id, str(iid)))

    result = image_gen_router.generate_images(
        prompt,
        model=image_model,
        n=int(body.get("n") or 1),
        size=body.get("size") or "2K",
        reference_image_paths=refs or None,
        enable_sequential=bool(body.get("enable_sequential")),
        aspect_ratio=body.get("aspect_ratio") or "1:1",
        filename_prefix=body.get("filename_prefix") or "aiimg",
    )
    task_service.complete_task(db, task, result)
    return task_service.task_to_dict(task)


def merge_images(db: Session, user: User, body: dict) -> dict:
    paths = [_file_path(db, user.user_id, i) for i in body.get("image_ids", [])]
    return image_service.merge_images(paths, body.get("merge_mode", "horizontal"), body.get("output_size"))


def add_elements(db: Session, user: User, body: dict) -> dict:
    path = _file_path(db, user.user_id, body["image_id"])
    return image_service.add_elements(path, body.get("elements", []))


def crop_resize(db: Session, user: User, body: dict) -> dict:
    """前端传 image_ids[] + operation（v2）。"""
    image_ids = body.get("image_ids") or []
    if not image_ids and body.get("image_id"):
        image_ids = [body["image_id"]]
    if not image_ids:
        from app.core.exceptions import AppException
        raise AppException("请提供 image_ids", 400)

    operation = body.get("operation", "resize")
    paths = [_file_path(db, user.user_id, iid) for iid in image_ids]
    results = [image_service.apply_crop_operation(p, operation) for p in paths]
    return {"result_url": results[0]["result_url"]}


def list_templates(template_type: str | None, category: str | None, page: int, page_size: int) -> dict:
    items = TEMPLATES
    if template_type:
        items = [t for t in items if t["type"] == template_type]
    if category:
        items = [t for t in items if t["category"] == category]
    start = (page - 1) * page_size
    return {"items": items[start : start + page_size], "total": len(items), "page": page, "page_size": page_size}


def get_task(db: Session, user: User, task_id: str) -> dict:
    from app.core.exceptions import AppException
    from app.models.task import Task

    task = db.get(Task, task_id)
    if not task or task.user_id != user.user_id:
        raise AppException("任务不存在", 404)

    if task.task_type == "video_generate" and task.status == "processing" and not settings.celery_enabled:
        elapsed = (datetime.now(timezone.utc) - task.created_at).total_seconds()
        if elapsed >= 1:
            body = task.input_data or {}
            image_ids = body.get("image_ids") or body.get("product_images") or []
            paths = []
            for iid in image_ids:
                try:
                    record = get_user_file(db, user.user_id, iid)
                    paths.append(Path(record.file_path))
                except Exception:
                    continue

            duration = int(body.get("duration", 15) or 15)
            music = bool(body.get("music", False))
            result = video_service.generate_product_video(paths, duration, music)
            task_service.complete_task(db, task, {
                "status": result.get("status", "completed"),
                "progress": 100,
                "result_url": result.get("result_url", ""),
                "result": {"result_url": result.get("result_url", "")},
                "mode": result.get("mode", ""),
            })

    return task_service.task_to_dict(task)
