# 智能导员系统 v2.1.1

一个专为大学生设计的智能助手，提供学习、生活、职业规划等方面的建议和指导。

## 项目结构

```
智能导员/
├── index.html          # 激活页面（入口页面）
├── advisor.html        # 智能导员主页面
├── admin.html          # 管理员面板
├── activation.js       # 激活码管理逻辑
├── advisor.js          # 智能导员聊天功能
├── admin.js           # 管理员面板功能
├── style.css          # 全局样式文件
├── vercel.json        # Vercel部署配置
└── package.json       # 项目配置文件
```

## 部署说明

### Vercel 部署

1. 将项目上传到 GitHub 仓库
2. 在 Vercel 中导入该仓库
3. Vercel 会自动检测到 `vercel.json` 配置文件
4. 部署完成后，访问域名会自动跳转到激活页面

### 路由配置

- `/` - 激活页面 (index.html)
- `/advisor` - 智能导员主页面 (advisor.html) 
- `/admin` - 管理员面板 (admin.html)

## 功能特性

- **激活码系统**: 用户需要输入有效激活码才能使用
- **智能对话**: 基于 Coze API 的智能问答系统
- **流式输出**: 模拟打字机效果的消息显示
- **管理员面板**: 激活码管理和使用日志查看
- **响应式设计**: 支持移动端和桌面端

## 技术栈

- HTML5 + CSS3 + JavaScript (ES6+)
- Font Awesome 图标库
- Coze API 智能对话
- LocalStorage 数据持久化

## 激活码

默认激活码列表：
- j6si0f26cig0
- polex311eo4e
- gwhfntmgol8l
- sej5z1hhleqf
- 2ta1zchbuj8v
- 6uwqby0nk0fv
- jza4m0okaflj
- 5n51yax303tm
- by8fahc1taa3
- v61g1yyvbgg6

开发者激活码：`jqkkf0922`

## 开发团队

jqk开发团队