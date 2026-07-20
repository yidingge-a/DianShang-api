# 全链路电商智能系统 - 后端（独立仓库）

> **独立仓库说明**：本仓库已从 sea-platform 拆出，本地路径为 /home/honor/dianshang-api，与 sea-platform（/home/honor/project）分离维护，不再作为其子目录挂载。

基于《后端接口需求文档 v1.0》实现的 FastAPI 后端，采用分层架构：

```
dianshang-api/
├── app/
│   ├── main.py              # 应用入口
│   ├── config.py            # 配置
│   ├── database.py          # 数据库
│   ├── api/v1/              # 路由层（仅做参数校验与响应包装）
│   ├── services/            # 业务逻辑层
│   ├── models/              # SQLAlchemy ORM
│   ├── schemas/             # Pydantic 模型
│   ├── core/                # 响应格式、异常、JWT
│   └── utils/               # 文件存储等工具
├── uploads/                 # 上传文件目录
├── data/                    # SQLite 数据库（默认）
└── requirements.txt
```

## 快速启动

```bash
cd /home/honor/dianshang-api
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # 按需修改 SECRET_KEY

# 启动服务
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- API 文档：http://localhost:8000/docs
- 基础路径：`http://localhost:8000/api/v1`

## 模块与路由

| 模块 | 前缀 |
|------|------|
| 认证 | `/api/v1/auth` |
| 文件上传 | `/api/v1/upload` |
| 智能美工 | `/api/v1/smart-design` |
| 合规文案 | `/api/v1/compliance` |
| 定价成本 | `/api/v1/pricing` |
| 市场分析 | `/api/v1/market` |
| 上架发布 | `/api/v1/publish` |
| 数据运营 | `/api/v1/operation` |

## 环境变量（`.env`）

所有密钥与外部服务地址统一写在项目根目录 `.env`（模板见 `.env.example`）：

| 变量 | 说明 |
|------|------|
| `OPENAI_API_KEY` | LLM 文案/策略（可与 `deploy/.env` 中同名项一致） |
| `OPENAI_BASE_URL` | 默认 `https://kuaipao.ai/v1` |
| `LLM_CHAT_MODEL` | 默认 `gpt-5.4` |
| `VISION_API_BASE` / `VISION_MODEL` | 视觉 vLLM（未填则用 Pillow 本地抠图） |
| `VIDEO_API_*` | 视频生成 API（未填则返回占位 mp4） |

未配置 `OPENAI_API_KEY` 时，AI 相关接口自动回退模板数据，不影响前后端联调。

## 说明

- **AI**：`services/llm_client.py` + `services/ai_service.py` 已接入 OpenAI 兼容 API；配置 Key 后合规文案、广告、运营策略、市场报告摘要等将走真实大模型。
- **图像**：`services/vision_client.py` 预留 vLLM 多模态；未配置时 `image_service` 使用 Pillow。
- **异步任务**：图片处理已同步完成；视频/报告类接口预留 `Task` 模型，生产建议接 Celery + Redis。
- **数据库**：默认 SQLite，可通过 `DATABASE_URL` 切换 PostgreSQL。
