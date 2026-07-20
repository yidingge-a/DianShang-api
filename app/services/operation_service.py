"""数据运营模块业务（监控落库，LLM/外部 API 驱动指标）。"""

from sqlalchemy.orm import Session



from app.core.exceptions import AppException

from app.models.monitor import MonitorSession

from app.models.user import User

from app.services.ai_service import ai_service

from app.services import ecommerce_intel_service





def generate_strategies(body: dict) -> dict:

    """营销策略：LLM 优先。"""

    llm_result = ai_service.generate_operation_strategies(body)

    if llm_result:

        return llm_result



    budget_raw = body.get("budget", 5000)

    budget = float(budget_raw) if budget_raw else 5000.0

    audience = body.get("target_audience", "25-35岁消费者")



    return {

        "strategies": [

            {

                "roi": 3.5,

                "budget": int(budget * 0.6),

                "duration": "30天",

                "estimated_sales": int(budget * 0.16),

                "target_audience": audience,

                "estimated_revenue": int(budget * 14.24),

                "description": "搜索推广+直通车组合，精准获取高意向流量",

                "channels": ["直通车", "搜索推广"],

            },

            {

                "roi": 2.8,

                "budget": int(budget * 0.4),

                "duration": "30天",

                "estimated_sales": int(budget * 0.1),

                "target_audience": audience,

                "estimated_revenue": int(budget * 10),

                "description": "短视频种草+达人合作，提升品牌曝光",

                "channels": ["抖音短视频", "小红书"],

            },

        ]

    }





def effect_estimate(body: dict) -> dict:

    return ecommerce_intel_service.effect_estimate(body)





def setup_monitor(db: Session, user: User, body: dict) -> dict:

    row = MonitorSession(

        user_id=user.user_id,

        name=body.get("name", "默认监控"),

        auto_refresh=bool(body.get("auto_refresh", True)),

        status="active",

    )

    db.add(row)

    db.commit()

    db.refresh(row)

    return {"monitor_id": row.monitor_id, "status": row.status}





def _get_monitor(db: Session, user: User, monitor_id: str) -> MonitorSession:

    row = db.get(MonitorSession, monitor_id)

    if not row or row.user_id != user.user_id:

        raise AppException("监控任务不存在", 404)

    return row





def get_monitor_data(db: Session, user: User, monitor_id: str, time_range: str) -> dict:

    row = _get_monitor(db, user, monitor_id)

    return ecommerce_intel_service.monitor_metrics(row.name, time_range)





def optimize_suggestions(body: dict) -> dict:

    metrics = body.get("data") or body.get("metrics", {})

    llm_suggestions = ai_service.generate_optimize_suggestions(metrics)

    if llm_suggestions:

        return {"suggestions": llm_suggestions}



    bounce = metrics.get("bounce_rate", 45)

    if isinstance(bounce, float) and bounce <= 1:

        bounce = bounce * 100



    suggestions = []

    if bounce > 42:

        suggestions.append({

            "priority": "high",

            "category": "主图优化",

            "description": "主图点击率偏低，跳出率偏高",

            "action": "使用智能美工模块重新生成主图",

            "expected_impact": "点击率提升 15-20%",

        })

    if not suggestions:

        suggestions.append({

            "priority": "low",

            "category": "持续监控",

            "description": "当前数据表现良好",

            "action": "保持现有运营策略",

            "expected_impact": "稳定维持当前转化水平",

        })

    return {"suggestions": suggestions}

