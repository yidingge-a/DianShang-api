"""市场分析模块业务（产业链、报告字段与前端对齐）。"""

from sqlalchemy.orm import Session



from app.config import get_settings

from app.models.user import User

from app.services.ai_service import ai_service

from app.services import ecommerce_intel_service

from app.services.task_service import complete_task, create_task, task_to_dict

from app.utils.content_files import write_market_report_html



settings = get_settings()





def industry_chain_match(body: dict) -> dict:

    return ecommerce_intel_service.industry_chain_match(body)





def generate_report(db: Session, user: User, body: dict) -> dict:

    keyword = body.get("product_keyword") or body.get("keyword", "")

    platforms = body.get("platforms", ["taobao", "jd", "pdd", "douyin"])

    task = create_task(db, user.user_id, "market_report", body)



    platform_data = ecommerce_intel_service.market_platform_data(keyword, platforms)



    insights = ai_service.generate_market_insights(keyword, platforms)

    if insights and isinstance(insights.get("summary"), dict):

        summary = insights["summary"]

        analysis_text = insights.get("analysis_text", "")

    else:

        summary = {

            "market_heat": 82,

            "heat_change": 12,

            "competition_level": "medium",

            "growth_potential": "high",

            "estimated_growth_rate": 15.0,

        }

        analysis_text = ""



    report_url = write_market_report_html(task.task_id, keyword, summary, analysis_text)

    complete_task(db, task, {

        "status": "completed",

        "summary": summary,

        "platform_data": platform_data,

        "trend_analysis": {

            "price_trend": "stable",

            "demand_trend": "rising",

            "seasonal_factor": "medium",

        },

        "product_keyword": keyword,

        "report_url": report_url,

        "analysis_text": analysis_text,

    })

    return task_to_dict(task)





def get_trends(keyword: str, platform: str, metric: str, time_range: str) -> dict:

    return ecommerce_intel_service.get_trends(keyword, platform, metric, time_range)





def get_overview(keyword: str) -> dict:

    return ecommerce_intel_service.get_overview(keyword)

