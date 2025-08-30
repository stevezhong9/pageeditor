# JSON Patch 导购页编辑器

一个基于 JSON Patch 的导购页面编辑器 Demo，演示"持续对话修改 → Patch → 增量应用 → 实时渲染"的完整流程。

## ✨ 核心特性

### 🔄 JSON Patch 增量更新
- 使用 `fast-json-patch` 实现精确的增量更新
- 支持 RFC 6902 标准的 JSON Patch 操作
- 自动 patch 优化和安全验证

### 💬 对话式编辑
- AI 助手理解自然语言指令
- 自动生成对应的 JSON Patch 操作
- 实时应用修改并渲染页面

### 📚 版本管理
- Git-like 的版本控制系统
- 支持回滚/前进到任意历史版本
- 可视化版本历史和变更记录

### 🎨 模块化渲染
- Hero/USP/FAQ 等页面模块组件
- 支持品牌配色和样式定制
- 响应式设计适配多设备

### 🛠 开发友好
- JSON 编辑器直接修改页面数据
- 实时预览所见即所得
- 完整的 TypeScript 类型支持

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000 查看效果

## 🏗 技术架构

### 核心依赖
- **React + TypeScript** - 前端框架
- **Vite** - 构建工具
- **Zustand** - 状态管理
- **TailwindCSS** - 样式框架
- **fast-json-patch** - JSON Patch 引擎
- **jsondiffpatch** - 差异计算和可视化

### 项目结构
```
src/
├── components/
│   ├── editor/          # 编辑器组件
│   │   ├── ChatEditor.tsx    # 对话式编辑
│   │   ├── JsonEditor.tsx    # JSON编辑器
│   │   └── VersionHistory.tsx # 版本历史
│   ├── layout/          # 页面布局组件
│   │   ├── HeroSection.tsx    # Hero区域
│   │   ├── USPSection.tsx     # 卖点区域
│   │   ├── FAQSection.tsx     # FAQ区域
│   │   └── PageRenderer.tsx   # 页面渲染器
│   └── ui/              # UI组件
│       └── Toolbar.tsx        # 工具栏
├── stores/
│   └── pageStore.ts     # 页面状态管理
├── types/
│   └── schema.ts        # 类型定义
├── utils/
│   └── patchEngine.ts   # Patch引擎
└── App.tsx              # 主应用
```

## 🎯 使用说明

### 1. 对话式编辑
在左侧对话框中输入自然语言指令，例如：
- "把标题改得更吸引人"
- "添加一个环保相关的卖点"
- "把按钮文字改成立即购买"

AI 会自动理解并生成对应的 JSON Patch，实时更新页面。

### 2. JSON 编辑
点击工具栏的"JSON编辑"按钮，可以直接修改页面的 JSON 数据结构：
```json
{
  "hero": {
    "headline": "你的标题",
    "subhead": "副标题描述",
    "cta": "行动按钮",
    "image": "图片URL"
  },
  "usps": [
    {"icon": "✨", "text": "卖点描述"}
  ]
}
```

### 3. 版本历史
点击"版本历史"查看所有修改记录，支持：
- 查看每次修改的详细变更
- 一键回滚到任意历史版本
- 前进/后退版本导航

## 🔧 核心实现

### Patch 引擎
```typescript
import { applyPatch, compare } from 'fast-json-patch';

// 应用 patches
const newLayout = PatchEngine.applyPatches(currentLayout, patches);

// 生成 patches
const patches = PatchEngine.generatePatches(oldLayout, newLayout);
```

### 版本管理
```typescript
class VersionManager {
  addVersion(layout: PageLayout, message: string, patches: PatchOperation[])
  rollback(): PageLayout | null
  forward(): PageLayout | null
  switchToVersion(versionId: string): PageLayout | null
}
```

### 状态管理
```typescript
const usePageStore = create<PageState>()((set, get) => ({
  layout: initialPageLayout,
  applyPatches: (patches, message) => {
    const newLayout = PatchEngine.applyPatches(state.layout, patches);
    state.layout = newLayout;
    state.versionManager.addVersion(newLayout, message, patches);
  }
}));
```

## 🧪 示例 Patch 操作

### 修改标题
```json
[{"op": "replace", "path": "/hero/headline", "value": "新的标题"}]
```

### 添加卖点
```json
[{"op": "add", "path": "/usps/-", "value": {"icon": "🌱", "text": "环保材质"}}]
```

### 更新 CTA 按钮
```json
[{"op": "replace", "path": "/hero/cta", "value": "立即购买"}]
```

## 🚧 扩展方向

### 1. 真实 AI 集成
将模拟的 AI 逻辑替换为 Claude/GPT API 调用：
```typescript
const generatePatchesFromAI = async (userMessage: string, currentLayout: PageLayout) => {
  const response = await callClaudeAPI({
    prompt: `根据用户请求生成JSON Patch: ${userMessage}`,
    context: currentLayout
  });
  return JSON.parse(response);
};
```

### 2. 更多页面模块
- 产品规格表
- 用户评价
- 购买流程
- 优惠信息

### 3. 协同编辑
集成 Y.js 或 Automerge 实现多人协同编辑。

### 4. 数据持久化
添加后端 API 保存页面和版本历史到数据库。

## 📄 License
MIT

---

这个 Demo 展示了如何使用 JSON Patch 技术实现增量更新的页面编辑器，为构建更复杂的导购页生成系统提供了技术基础。