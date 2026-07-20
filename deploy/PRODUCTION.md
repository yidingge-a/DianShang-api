# 生产上线指南

## 1. 环境变量（`DianShang_project/.env`）

```env
APP_ENV=prod
DEBUG=false
SECRET_KEY=请替换为64位以上随机串
LOG_LEVEL=INFO

DATABASE_URL=postgresql+psycopg2://dianshang:强密码@postgres:5432/ecommerce
REDIS_URL=redis://redis:6379/0
CELERY_ENABLED=true

BASE_URL=https://你的域名
CORS_ORIGINS=https://你的域名

# LLM / 第三方（见 .env.example）
OPENAI_API_KEY=...
```

## 2. 前端构建

```bash
cd nocode/nocode
npm ci
npm run build
cp -r build ../DianShang_project/frontend_dist
# 或 Windows: xcopy build ..\DianShang_project\frontend_dist /E /I
```

## 3. Docker 一键启动

```bash
cd DianShang_project/deploy
docker compose up -d --build
```

服务：

| 组件 | 说明 |
|------|------|
| postgres | 业务库 |
| redis | Celery 队列 |
| api | FastAPI + Alembic 迁移 |
| worker | 上架 / 视频异步任务 |
| nginx | 静态前端 + `/api` 反代 + `/uploads` |

## 4. 上线前检查

- [ ] `DEBUG=false`，`SECRET_KEY` 已更换
- [ ] 所有业务 API 需登录（仅 `/health`、`/auth/*` 公开）
- [ ] `CELERY_ENABLED=true` 且 worker 运行中
- [ ] 对象存储（可选）：`STORAGE_BACKEND=s3` + S3 变量
- [ ] HTTPS（在 Nginx 前加证书或云 LB）
- [ ] 数据库备份策略

## 5. 本地开发（不变）

```bash
bash scripts/start_backend.sh   # DEBUG=true 可用 dev 账号
npm run dev                     # 前端 :8080
```
