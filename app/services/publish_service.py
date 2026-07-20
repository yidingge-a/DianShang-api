"""上架发布模块业务（产品字段 id、上架任务落库、真实铺货/网关上架）。"""

import random



from sqlalchemy import select

from sqlalchemy.orm import Session



from app.config import get_settings
from app.core.exceptions import AppException

from app.models.product import Product

from app.models.task import Task

from app.models.user import User

from app.services import task_service

from app.services.ai_service import ai_service

from app.services.platform_publish_client import publish_to_platform

from app.utils import utc_now_iso

settings = get_settings()



PLATFORMS = [

    {"id": "taobao", "name": "淘宝", "commission_rate": "5%", "traffic_level": "高"},

    {"id": "tmall", "name": "天猫", "commission_rate": "8%", "traffic_level": "高"},

    {"id": "jd", "name": "京东", "commission_rate": "6%", "traffic_level": "中"},

    {"id": "pdd", "name": "拼多多", "commission_rate": "3%", "traffic_level": "高"},

    {"id": "douyin", "name": "抖音", "commission_rate": "4%", "traffic_level": "高"},

]



_PLATFORM_NAMES = {p["id"]: p["name"] for p in PLATFORMS}





def _product_out(p: Product) -> dict:

    return {

        "id": p.product_id,

        "name": p.name,

        "price": float(p.price or 0),

        "category": p.category or "未分类",

    }





def list_products(db: Session, user: User, page: int = 1, page_size: int = 100) -> list[dict]:

    rows = db.scalars(

        select(Product)

        .where(Product.user_id == user.user_id)

        .order_by(Product.updated_at.desc())

        .offset((page - 1) * page_size)

        .limit(page_size)

    ).all()

    return [_product_out(p) for p in rows]





def create_product(db: Session, user: User, body: dict) -> dict:

    price = body.get("price", 0)

    try:

        price = float(price)

    except (TypeError, ValueError):

        price = 0.0



    p = Product(

        user_id=user.user_id,

        name=body["name"],

        description=body.get("description"),

        category=body.get("category", "未分类"),

        price=price,

        cost=float(body.get("cost", 0) or 0),

        status=body.get("status", "draft"),

    )

    if body.get("images"):

        p.images = body["images"]

    db.add(p)

    db.commit()

    db.refresh(p)

    return _product_out(p)





def update_product(db: Session, user: User, product_id: str, body: dict) -> dict:

    p = _get_product(db, user, product_id)

    for field in ("name", "description", "category", "subcategory", "price", "cost", "status"):

        if field in body:

            setattr(p, field, body[field])

    if "images" in body:

        p.images = body["images"]

    db.commit()

    db.refresh(p)

    return _product_out(p)





def delete_product(db: Session, user: User, product_id: str) -> None:

    p = _get_product(db, user, product_id)

    db.delete(p)

    db.commit()





def _get_product(db: Session, user: User, product_id: str) -> Product:

    p = db.get(Product, product_id)

    if not p or p.user_id != user.user_id:

        raise AppException("产品不存在", 404)

    return p





def platform_recommendation(db: Session, user: User, body: dict) -> dict:

    price = 89.0

    category = body.get("category", "")

    product_id = body.get("product_id")

    if product_id:

        p = db.get(Product, product_id)

        if p and p.user_id == user.user_id:

            price = float(p.price or 89)

            category = p.category or category



    llm = ai_service.generate_platform_recommendation(price, category, body)

    if llm and llm.get("platforms"):

        return llm



    platform_defs = [

        ("淘宝", "C2C", "taobao", 0.05),

        ("天猫", "B2C", "tmall", 0.08),

        ("京东", "B2C", "jd", 0.06),

        ("拼多多", "社交电商", "pdd", 0.03),

        ("抖音", "兴趣电商", "douyin", 0.04),

    ]

    recs = []

    for name, ptype, pid, fee in platform_defs:

        score = 75

        if price < 50 and pid == "pdd":

            score += 12

        if price > 200 and pid in ("tmall", "jd"):

            score += 10

        if pid == "douyin":

            score += 5

        recs.append({

            "name": name,

            "type": ptype,

            "match_score": min(score, 98),

            "estimated_traffic": "高" if score > 85 else "中",

            "commission_rate": f"{int(fee * 100)}%",

            "competition_level": "中",

            "suggested_price": round(price * _price_factor(pid), 2),

            "reason": f"适合{category or '该品类'}在{name}销售",

        })

    recs.sort(key=lambda x: x["match_score"], reverse=True)

    return {"platforms": recs[:4]}





def _price_factor(pid: str) -> float:

    base = {"pdd": 0.92, "taobao": 0.98, "jd": 1.02}.get(pid, 1.0)

    return base * random.uniform(0.98, 1.02)





def list_platforms() -> list[dict]:

    return PLATFORMS





def publish_product(db: Session, user: User, body: dict) -> dict:
    """提交上架任务（Task 表持久化，publish_id = task_id）。"""
    product_id = body.get("product_id")
    _get_product(db, user, product_id)
    task = task_service.create_task(db, user.user_id, "publish", body)
    if settings.celery_enabled:
        from app.tasks.worker_tasks import run_publish_task
        run_publish_task.delay(task.task_id, user.user_id)
    return {
        "publish_id": task.task_id,
        "status": "processing",
        "product_id": product_id,
        "platforms": body.get("platforms", []),
        "created_at": utc_now_iso(),
    }





def _execute_publish(db: Session, user: User, task: Task) -> dict:

    product = _get_product(db, user, task.input_data.get("product_id"))

    platforms = task.input_data.get("platforms", [])

    results = [publish_to_platform(product, pid, task.task_id) for pid in platforms]



    published = [pid for pid, r in zip(platforms, results) if r.get("success")]

    if published:

        existing = set(product.platforms)

        existing.update(published)

        product.platforms = list(existing)

        product.status = "published"

        db.commit()



    return {

        "publish_id": task.task_id,

        "status": "completed",

        "product_id": product.product_id,

        "platforms": platforms,

        "results": results,

    }





def get_publish_task(db: Session, user: User, publish_id: str) -> dict:
    """查询上架进度；无 Celery 时在轮询时同步执行铺货。"""
    task = db.get(Task, publish_id)
    if not task or task.user_id != user.user_id or task.task_type != "publish":
        raise AppException("上架任务不存在", 404)

    if task.status == "processing" and not settings.celery_enabled:
        result = _execute_publish(db, user, task)
        task_service.complete_task(db, task, result)
        return result

    data = task_service.task_to_dict(task)
    if "results" not in data:
        data["results"] = []
    return data

