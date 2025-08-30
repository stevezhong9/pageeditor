# 🚀 PageEditor 部署指南

## 📦 项目已准备就绪

✅ **项目配置完成**：
- `vercel.json` - Vercel 部署配置
- `.vercelignore` - 忽略不必要文件
- `package.json` - 更新项目信息
- Git 仓库初始化并提交所有代码
- 构建测试通过

## 📝 手动部署步骤

### 1. 创建 GitHub 仓库
1. 访问 https://github.com/new
2. 仓库名：`pageeditor`
3. 设为 **Public**（公开）
4. **不要**勾选任何初始化选项
5. 点击 "Create repository"

### 2. 推送代码到 GitHub
在项目目录执行以下命令（替换 [YOUR_USERNAME] 为您的实际用户名）：

```bash
# 添加远程仓库
git remote add origin https://github.com/[YOUR_USERNAME]/pageeditor.git

# 推送代码
git push -u origin main
```

### 3. Vercel 部署
1. 访问 https://vercel.com/new
2. 选择 "Import Git Repository"
3. 选择您的 GitHub 账户和 `pageeditor` 仓库
4. 配置设置：
   - **Project Name**: pageeditor
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. 点击 "Deploy"

### 4. 配置自定义域名
部署成功后：
1. 在 Vercel 项目页面，进入 "Settings" → "Domains"
2. 添加域名：`pageeditor.sharetox.com`
3. Vercel 会提供 DNS 配置信息

### 5. DNS 配置
在您的域名管理控制台添加 CNAME 记录：
```
类型: CNAME
名称: pageeditor
值: cname.vercel-dns.com
TTL: Auto
```

## 🔧 环境变量（可选）
如果需要配置环境变量，在 Vercel 项目设置中添加：
- `VITE_APP_TITLE=Claude AI 导购页编辑器`

## ✅ 验证部署
部署完成后，访问 `https://pageeditor.sharetox.com` 验证：
- [ ] 页面正常加载
- [ ] AI 对话功能正常
- [ ] 实时预览功能正常
- [ ] 下载功能正常
- [ ] 发布功能正常

## 🔄 后续更新
每次更新代码后：
```bash
git add .
git commit -m "Update: 描述更改内容"
git push origin main
```
Vercel 会自动重新部署。

---

## 🆘 需要帮助？
如果您在部署过程中遇到问题：
1. 检查控制台错误信息
2. 确认所有文件已正确推送到 GitHub
3. 验证 Vercel 构建日志
4. 确认域名 DNS 配置正确

## 📱 项目功能
- **AI 对话编辑** - 使用 Claude AI 自然语言编辑导购页
- **实时预览** - 所见即所得的页面预览
- **下载功能** - 一键下载完整的 ZIP 包
- **发布功能** - 发布到自定义 URL 地址
- **JSON Patch** - 增量更新机制
- **响应式设计** - 支持移动端访问