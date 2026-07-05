# AI Image Gen - 完整开发计划

> 项目位置: E:\imweb\ai-image-gen
> 编制日期: 2026年6月29日
> 版本: v1.0

---

## 项目概述

开发一个全新的多功能AI图像生成Web平台，支持文生图、图生图、多图参考、并行生成、图片编辑和多模型API接入。

**与之前 E:\ai-image-studio 的区别：**
- 全新项目，不是重构
- 不同技术栈（Next.js + FastAPI vs React + Express）
- 更现代化的架构
- 更多AI模型支持

---

## 完整开发阶段规划

### Phase 0: 项目初始化与环境搭建（预计1天）

**目标**：创建项目骨架，配置开发环境

**任务清单**：
1. 创建项目目录结构
2. 初始化前端Next.js项目
3. 初始化后端FastAPI项目
4. 配置Python虚拟环境
5. 配置Tailwind CSS
6. 配置TypeScript
7. 设置代码规范（ESLint + Prettier）
8. 配置Docker Compose（PostgreSQL + Redis + MinIO）

**交付物**：
- 可运行的空项目骨架
- 前后端开发服务器可启动
- 基础目录结构

---

### Phase 1: 核心UI框架搭建（预计2天）

**目标**：完成前端页面布局和基础组件

**任务清单**：
1. 创建页面布局（Header、Sidebar、Main Content）
2. 实现响应式设计
3. 开发核心组件：
   - 图片上传组件（拖拽+点击）
   - 提示词输入框
   - 模型选择器
   - 参数控制面板
   - 图片结果展示网格
   - 下载按钮组件
4. 配置全局状态管理（Zustand）
5. 实现路由导航

**技术选型**：
- Next.js 14 + App Router
- Tailwind CSS + shadcn/ui
- React Hook Form + Zod验证
- Zustand状态管理

**交付物**：
- 完整的前端UI框架
- 所有基础组件可交互
- 页面可响应不同屏幕尺寸

---

### Phase 2: 后端API与模型适配器（预计3天）

**目标**：实现后端服务和多模型API适配

**任务清单**：
1. 搭建FastAPI后端服务
2. 实现API路由：
   - POST /api/generate（图片生成）
   - POST /api/edit（图片编辑）
   - GET /api/models（模型列表）
   - POST /api/upload（图片上传）
   - GET /api/tasks/{id}（任务状态）
3. 开发模型适配器层：
   - FalAiAdapter（fal.ai）
   - ReplicateAdapter（Replicate）
   - StabilityAiAdapter（Stability AI）
   - AgnesAiAdapter（Agnes AI）
   - OpenAiAdapter（OpenAI DALL·E）
4. 实现异步任务队列（Celery + Redis）
5. 配置图片存储（MinIO/S3）
6. 实现API密钥管理

**技术选型**：
- FastAPI + Uvicorn
- Celery + Redis（异步任务）
- MinIO（图片存储）
- SQLAlchemy（ORM）

**交付物**：
- 完整的RESTful API
- 5个模型适配器可独立测试
- 异步任务队列运行正常

---

### Phase 3: 并行生成与任务管理（预计2天）

**目标**：实现多任务并行处理和进度跟踪

**任务清单**：
1. 实现并发控制（Semaphore）
2. 开发任务队列管理器
3. 前端进度条组件
4. WebSocket实时推送生成状态
5. 实现取消/重试机制
6. 批量生成功能
7. 错误处理和重试逻辑

**交付物**：
- 可同时发起多个生成请求
- 实时进度显示
- 支持批量生成和下载

---

### Phase 4: 图片编辑功能（预计3天）

**目标**：实现Canvas级别的图片二次编辑

**任务清单**：
1. 集成Fabric.js Canvas编辑器
2. 实现基础编辑功能：
   - 裁剪/旋转/翻转
   - 亮度/对比度/饱和度调整
3. 实现高级编辑功能：
   - 蒙版选择区域
   - 局部重绘（Inpainting）
   - 风格迁移
4. 编辑历史回滚
5. 编辑结果重新提交生成

**交付物**：
- 完整的图片编辑器
- 支持多种编辑操作
- 编辑后可重新AI生成

---

### Phase 5: 用户系统与积分管理（预计2天）

**目标**：实现用户认证和积分系统

**任务清单**：
1. 用户注册/登录（JWT）
2. OAuth 2.0集成（可选）
3. 积分系统：
   - 充值记录
   - 消耗统计
   - 余额查询
4. 生成历史管理
5. 图片收藏功能

**交付物**：
- 完整的用户系统
- 积分管理和消耗追踪
- 历史记录查询

---

### Phase 6: 测试与优化（预计2天）

**目标**：全面测试和优化性能

**任务清单**：
1. 单元测试（pytest + Jest）
2. 集成测试
3. 性能优化：
   - 图片压缩
   - CDN配置
   - 缓存策略
4. 安全性测试
5. 用户体验优化
6. 移动端适配

**交付物**：
- 测试覆盖率>80%
- 页面加载<2秒
- 生成响应<30秒

---

### Phase 7: 部署上线（预计1天）

**目标**：完成生产环境部署

**任务清单**：
1. Docker镜像构建
2. 生产环境配置
3. SSL证书配置
4. 域名绑定
5. 监控告警配置
6. 备份策略

**交付物**：
- 可访问的生产站点
- 完整的监控体系
- 灾备方案

---

## 技术栈汇总

### 前端
| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 14+ | React框架 |
| React | 18+ | UI库 |
| TypeScript | 5+ | 类型安全 |
| Tailwind CSS | 3+ | 样式 |
| shadcn/ui | latest | UI组件 |
| Zustand | 4+ | 状态管理 |
| Fabric.js | 5+ | Canvas编辑 |
| React Hook Form | 7+ | 表单处理 |
| Zod | 3+ | 数据验证 |

### 后端
| 技术 | 版本 | 用途 |
|------|------|------|
| FastAPI | 0.100+ | Python Web框架 |
| Uvicorn | latest | ASGI服务器 |
| Celery | 5+ | 异步任务 |
| Redis | 7+ | 缓存/消息队列 |
| SQLAlchemy | 2+ | ORM |
| Pydantic | 2+ | 数据验证 |

### 基础设施
| 技术 | 用途 |
|------|------|
| PostgreSQL | 数据库 |
| MinIO | 对象存储 |
| Docker | 容器化 |
| Nginx | 反向代理 |

### AI模型API
| 服务商 | 接入方式 |
|--------|----------|
| fal.ai | Python SDK + REST |
| Agnes AI | OpenAI兼容接口 |
| Replicate | REST API |
| Stability AI | REST API |
| OpenAI | OpenAI兼容接口 |

---

## 项目目录结构

```
E:\imweb\ai-image-gen\
├── frontend\                 # 前端Next.js项目
│   ├── src\
│   │   ├── app\             # Next.js App Router
│   │   ├── components\      # React组件
│   │   │   ├── ui\          # 基础UI组件(shadcn)
│   │   │   ├── editor\      # 图片编辑器组件
│   │   │   ├── upload\      # 上传组件
│   │   │   └── gallery\     # 图片画廊
│   │   ├── hooks\           # 自定义Hooks
│   │   ├── stores\          # Zustand状态管理
│   │   ├── lib\             # 工具函数
│   │   └── types\           # TypeScript类型定义
│   ├── public\              # 静态资源
│   ├── package.json
│   └── tailwind.config.ts
│
├── backend\                  # 后端FastAPI项目
│   ├── app\
│   │   ├── api\             # API路由
│   │   ├── adapters\        # 模型适配器
│   │   ├── services\        # 业务逻辑
│   │   ├── models\          # 数据库模型
│   │   ├── core\            # 核心配置
│   │   └── tasks\           # Celery任务
│   ├── tests\               # 测试文件
│   ├── alembic\             # 数据库迁移
│   ├── Dockerfile
│   └── requirements.txt
│
├── docker\                   # Docker配置
│   ├── docker-compose.yml
│   ├── nginx\
│   └── configs\
│
├── docs\                     # 文档
│   ├── API_REFERENCE.md
│   └── DEPLOYMENT.md
│
└── README.md
```

---

## 风险和应对措施

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| API限流 | 生成速度慢 | 实现智能队列和重试 |
| 成本失控 | 费用过高 | 设置每日限额和预警 |
| 图片存储 | 空间不足 | 自动清理+冷热分离 |
| 编辑性能 | 大图片卡顿 | 图片压缩+Web Worker |
| 兼容性问题 | 部分浏览器不支持 | Polyfill+降级方案 |

---

*计划确认后开始Phase 0开发*
