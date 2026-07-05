# AI Image Gen - AI图像生成平台

一个功能强大的AI图像生成Web平台，支持文生图、图生图、多图参考、并行生成、图片编辑和多模型API接入。

## 🚀 快速启动

### 方法一：使用启动脚本

```bash
start.bat
```

### 方法二：手动启动

#### 1. 启动后端

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

### 方法三：Docker部署

```bash
docker compose -f docker/docker-compose.yml up --build -d
```

## 📍 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3001 |
| 后端 | http://localhost:8000 |
| API文档 | http://localhost:8000/docs |

## 🛠 技术栈

### 前端
- **Next.js 14** - React框架
- **Tailwind CSS** - 样式
- **Zustand** - 状态管理
- **Fabric.js** - Canvas编辑

### 后端
- **FastAPI** - Python Web框架
- **SQLAlchemy** - ORM
- **Celery + Redis** - 异步任务队列
- **MinIO** - 对象存储

### AI模型
- **中转站API** (api.bondai.cc) - 主接入点
- 支持扩展：fal.ai, Replicate, Stability AI, OpenAI

## 📁 项目结构

```
ai-image-gen/
├── frontend/              # Next.js前端
│   ├── src/
│   │   ├── app/          # Pages & Layouts
│   │   ├── components/   # React Components
│   │   ├── stores/       # Zustand Stores
│   │   ├── lib/          # Utilities
│   │   └── types/        # TypeScript Types
│   └── package.json
├── backend/               # FastAPI后端
│   ├── app/
│   │   ├── api/          # API Routes
│   │   ├── adapters/     # AI Model Adapters
│   │   ├── services/     # Business Logic
│   │   ├── models/       # DB Models
│   │   ├── core/         # Config
│   │   └── tasks/        # Celery Tasks
│   └── requirements.txt
├── docker/               # Docker配置
└── start.bat             # 一键启动脚本
```

## 🔌 API端点

### 生成相关
- `POST /api/v1/generation` - 创建生成任务
- `POST /api/v1/generation/batch` - 批量生成
- `GET /api/v1/generation/models` - 获取模型列表

### 上传相关
- `POST /api/v1/upload/image` - 上传单张图片
- `POST /api/v1/upload/images` - 批量上传图片

## 📝 开发计划

详见 [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)

## 📄 许可证

MIT
