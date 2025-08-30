# 🤖 Claude AI 导购页编辑器

一个基于 Claude AI 的智能导购页面编辑器，支持自然语言对话编辑、实时预览、一键下载和本地发布功能。

![Claude AI PageEditor](https://img.shields.io/badge/Claude-AI%20PageEditor-blue?style=for-the-badge&logo=anthropic)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0.2-3178C6?style=for-the-badge&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-4.4.5-646CFF?style=for-the-badge&logo=vite)

## ✨ 核心功能

### 🎯 AI 智能编辑
- **自然语言对话** - 通过对话形式编辑导购页内容
- **Claude API 集成** - 支持真实 Claude AI 或演示模式
- **JSON Patch 更新** - 增量更新机制，精准修改
- **实时反馈** - 即时显示编辑结果和错误信息

### 👁️ 实时预览
- **所见即所得** - 实时展示编辑效果
- **响应式设计** - 支持桌面和移动端预览
- **滚动同步** - 自动滚动到编辑区域

### 📦 导出功能
- **ZIP 下载** - 一键打包完整的 HTML、CSS、JS 文件
- **独立部署** - 生成的文件可直接部署到任何静态托管
- **资源完整** - 包含所有样式、脚本和使用说明

### 🚀 本地发布
- **自定义 URL** - 发布到 `pages/[自定义名称]` 地址
- **重复检测** - 防止页面名称冲突
- **本地存储** - 使用浏览器本地存储管理已发布页面

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式方案**: Tailwind CSS + 自定义 CSS
- **状态管理**: React Hooks + Zustand
- **AI 集成**: Claude API
- **文件处理**: JSZip + FileSaver
- **增量更新**: fast-json-patch + jsondiffpatch

## 🚀 快速开始

### 环境要求
- Node.js >= 16
- npm >= 7

### 本地开发
```bash
# 克隆项目
git clone https://github.com/stevezhong9/pageeditor.git
cd pageeditor

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 环境配置
创建 `.env` 文件：
```env
# Claude API 配置（可选）
VITE_CLAUDE_API_KEY=your_claude_api_key_here
VITE_CLAUDE_API_URL=https://api.anthropic.com/v1/messages
```

## 📁 项目结构

```
pageeditor/
├── src/
│   ├── services/           # 服务层
│   │   ├── claudeAPI.ts    # Claude API 集成
│   │   ├── downloadService.ts  # 下载服务
│   │   └── publishService.ts   # 发布服务
│   ├── types/              # TypeScript 类型定义
│   ├── utils/              # 工具函数
│   ├── ClaudeApp.tsx       # 主应用组件
│   └── main.tsx           # 应用入口
├── public/                 # 静态资源
├── dist/                   # 构建输出
├── vercel.json            # Vercel 部署配置
└── package.json           # 项目配置
```

## 🎨 功能演示

### 1. AI 对话编辑
```
用户: 将标题改为"革命性护肤体验"
AI: ✅ 已将标题更新为"革命性护肤体验"
```

### 2. 实时预览
- 编辑内容后立即在右侧预览面板显示
- 支持响应式预览，适配不同屏幕尺寸

### 3. 一键下载
- 点击"📦 下载导购页"生成完整 ZIP 包
- 包含 HTML、CSS、JS 和使用说明

### 4. 本地发布
- 点击"🚀 发布页面"设置自定义页面名称
- 发布到 `pages/[自定义名称]` URL
- 支持页面名称验证和重复检测

## 🔧 配置选项

### Claude API 设置
- 支持真实 Claude API 或演示模式
- 可在设置面板中配置 API Key
- 自动降级到演示模式（CORS 限制时）

### 页面模板
- Hero 区域：标题、副标题、CTA 按钮
- USP 区域：核心卖点展示
- FAQ 区域：常见问题解答（可选）

## 📱 部署指南

### Vercel 部署
1. 推送代码到 GitHub
2. 在 Vercel 中导入仓库
3. 配置构建设置：
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. 配置自定义域名（可选）

### 自定义域名
在 Vercel 项目设置中添加域名：
- 域名：`pageeditor.sharetox.com`
- DNS 配置：CNAME 记录指向 `cname.vercel-dns.com`

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源。

---

**🎯 目标用户**: 营销人员、产品经理、创业者  
**🔧 技术水平**: 无需编程经验，支持自然语言编辑  
**🌟 特色**: AI 驱动的智能编辑 + 一键部署

Made with ❤️ and Claude AI