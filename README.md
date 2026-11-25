# 智能论坛网站

基于 **Vue3 + Express + MySQL** 的前后端分离智能论坛系统，并集成 **Ollama 本地大模型（Qwen3-8B）**，实现内容摘要、多语种翻译、发帖自检、AI 扩写、辅助审核五项 AI 能力。毕业设计作品。

## ✨ 功能特性

### 用户端
- 📝 **发帖与评论**：支持楼层回复、评论计数、AI 辅助扩写
- 🔍 **内容检索**：标题/正文模糊搜索、分类筛选、最新/热门排序
- 👍 **互动体系**：点赞、收藏、浏览量统计、加权热度排行榜
- 👥 **社交功能**：用户关注、互关私信（未读角标轮询提醒）、用户主页
- 🎠 **首页体验**：Element Plus 轮播图、热门/最新侧边栏

### AI 能力（本地大模型）
| 功能 | 说明 |
|------|------|
| 内容摘要 | 发布后自动生成帖子摘要与一句话简介 |
| 多语种翻译 | 中/英/日/韩互译，整楼评论一次推理批量翻译 |
| 发帖自检 | 提交前检测错别字、风险词，给出修改建议 |
| AI 扩写 | 基于标题与短草稿扩写为 300-800 字正文，预览后追加/替换 |
| 辅助审核 | 发帖内容风险评级，辅助管理员审核 |

### 工程化设计
- **缓存复用**：基于 SHA-256 内容哈希 + `post_ai` 缓存表，内容未变更直接命中缓存，免推理秒级返回
- **多级降级**：模型服务异常时按「切换提供商（Ollama/OpenAI/Coze）→ 回退本地规则算法 → 显式报错」三级降级，主流程零阻断
- **差异化超时**：常规接口 15s，AI 接口按粒度配置 180s，适配本地模型推理耗时
- **安全防护**：JWT 认证、角色权限中间件（authenticate / optionalAuth / requireAdmin）、参数化 SQL 防注入、bcrypt 密码加盐哈希

### 管理后台
数据看板（Chart.js 发帖趋势折线图、分类分布饼图）、用户/帖子/分类管理、置顶与审核、热门 TOP10 榜单。

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue3 + TypeScript + Vite + Element Plus + Pinia + Vue Router + Axios + Chart.js |
| 后端 | Node.js + Express + mysql2 连接池 + JWT + bcryptjs |
| 数据库 | MySQL（12 张表，含关联索引与唯一约束） |
| AI | Ollama 本地部署 Qwen3-8B（可切换 OpenAI / 扣子 Coze API） |

## 🚀 快速开始

### 环境要求
- Node.js ≥ 18
- MySQL 8.0
- Ollama（可选，AI 功能需要，已装模型如 `qwen3:8b`）

### 1. 初始化数据库
```bash
mysql -u root -p < api/migrations/init.sql
```

### 2. 配置后端环境变量
```bash
cd api
cp .env.example .env    # 修改数据库连接信息
```

### 3. 启动后端（端口 3000）
```bash
npm install
npm run dev
```

### 4. 启动前端（端口 5173）
```bash
cd ../frontend
npm install
npm run dev
```

访问 http://localhost:5173 即可使用。

## 📁 项目结构

```
├── api/                    # 后端（Express）
│   ├── migrations/         #   建库建表脚本 init.sql
│   └── src/
│       ├── config/         #   数据库连接池
│       ├── middleware/     #   JWT 认证 / 权限 / 错误处理
│       ├── routes/         #   auth / posts / users / messages / ai / admin
│       ├── services/       #   AI 服务层（多提供商 + 缓存 + 降级）
│       └── utils/          #   演示数据 seed.js
└── frontend/               # 前端（Vue3 + TS）
    └── src/
        ├── components/     #   通用组件（Navbar / Sidebar / PostCard…）
        ├── views/          #   页面（首页 / 详情 / 发帖 / 私信 / 后台…）
        ├── router/         #   路由与守卫
        ├── stores/         #   Pinia 状态管理
        └── utils/          #   Axios 封装
```

## 📄 License

仅供学习交流使用。
