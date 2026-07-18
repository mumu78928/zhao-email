# Email Client (zhao-email)

一个轻量级多账户邮件客户端，支持 IMAP/SMTP 协议，QQ、163、新浪、139 等主流邮箱开箱即用。
基于 React 18 + TypeScript + Vite + Express 构建，可打包为单文件 Windows EXE。

## 特性

- **多账户统一管理** - 在一个界面管理多个邮箱账户，支持标签页切换
- **主流邮箱开箱即用** - QQ、163/126/yeah、新浪、139 邮箱预置官方授权地址
- **IMAP 收件 / SMTP 发件** - 完整支持邮件接收与发送
- **附件批量下载** - 多封邮件的附件一键打包为 ZIP（自动按邮件主题分文件夹）
- **HTML 邮件安全渲染** - 使用 iframe 沙箱隔离，防止邮件内容破坏页面结构
- **多层编码解码** - 完整支持 Quoted-Printable、MIME Header、UTF-8 编码处理
- **单文件 EXE 部署** - 通过 Node.js SEA 打包，邮箱授权码本地存储，不上传任何隐私

## 快速开始

### 方式一：使用预编译 EXE（推荐普通用户）

1. 前往 [Releases](https://github.com/mumu78928/zhao-email/releases) 下载最新版本的 `EmailClient-vX.X.X-win-x64.zip`
2. 解压到任意目录
3. 双击 `EmailClient.exe` 运行（首次运行会自动打开浏览器访问 `http://localhost:3001`）
4. 在设置页面配置邮箱账户（需要邮箱授权码，不是登录密码）

### 方式二：从源码运行（开发者）

#### 环境要求

- Node.js 18+
- npm 或 pnpm

#### 安装与启动

```bash
git clone https://github.com/mumu78928/zhao-email.git
cd zhao-email
npm install
npm run dev          # 同时启动前端和后端开发服务器
```

前端默认运行在 `http://localhost:5173`，后端 API 在 `http://localhost:3001`。

#### 打包 Windows EXE（SEA 方式）

```bash
npm run build:electron        # 构建前端和后端
# 然后用 postject 注入生成单文件 EXE
```

## 技术栈

- **前端**：React 18.3.1 + TypeScript 5.8 + Vite 6.3 + TailwindCSS 3.4
- **后端**：Express 4.21 + Node.js 18
- **邮件协议**：imap 0.8（接收）、nodemailer 9.0（发送）、mailparser 3.9（解析）
- **打包**：Vite + esbuild + Node.js SEA（Single Executable Application）
- **状态管理**：Zustand
- **ZIP 打包**：JSZip
- **图标**：Lucide React

## 项目结构

```
zhao-email/
├── src/                    # React 前端源码
│   ├── pages/              # 页面组件
│   │   ├── Inbox.tsx       # 收件箱
│   │   ├── Compose.tsx     # 撰写邮件
│   │   ├── Settings.tsx    # 邮箱账户设置
│   │   └── Home.tsx        # 首页
│   ├── components/         # 通用组件
│   │   ├── Sidebar.tsx     # 侧边栏
│   │   ├── Empty.tsx       # 空状态
│   │   └── ErrorBoundary.tsx
│   ├── store/              # Zustand 状态管理
│   ├── api/                # 前端 API 客户端
│   └── lib/                # 工具函数
├── api/                    # Express 后端
│   ├── routes/             # API 路由（auth、email）
│   ├── services/           # 邮件服务（IMAP/SMTP 封装）
│   ├── app.ts              # Express 应用配置
│   └── server.ts           # 服务入口
├── electron/               # Electron / SEA 打包相关
│   ├── main.cjs            # Electron 主进程
│   ├── build-server.mjs    # 后端 esbuild 打包脚本
│   └── sea-entry.cjs       # SEA 入口
├── release/                # 编译产物（已 gitignore）
└── dist/                   # 前端构建输出（已 gitignore）
```

## 邮箱授权码获取

不同邮箱服务商的授权码获取方式不同，授权码**不是登录密码**，需要单独开启：

- **QQ 邮箱**：https://service.mail.qq.com/ → 账户 → POP3/IMAP 服务 → 生成授权码
- **163/126/yeah 邮箱**：https://mail.163.com/ → 设置 → POP3/SMTP/IMAP → 客户端授权密码
- **新浪邮箱**：https://mail.sina.com.cn/ → 設置 → 客戶端授權碼
- **139 邮箱**：https://mail.10086.cn/ → 设置 → 客户端授权密码

> **注意**：授权码是敏感信息，配置后仅保存在本地浏览器 LocalStorage 中，不会上传到任何服务器。

## 开发说明

### 端口冲突

默认后端运行在 `3001` 端口，前端开发服务器在 `5173` 端口。如果端口被占用：

```bash
# Windows PowerShell 释放 3001 端口
Get-NetTCPConnection -LocalPort 3001 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### IMAP/SMTP 协议

项目使用以下协议：
- **IMAP** 接收邮件（端口 993，SSL）
- **SMTP** 发送邮件（端口 465，SSL）

所有连接均经过超时保护（IMAP 120s、SMTP 60s、附件下载 60s），并启用了 keepalive 防止连接冻结。

### 编码处理

针对国内邮箱服务商的特殊编码（特别是 139 邮箱、QQ 邮箱的 Quoted-Printable 编码）实现了多层解码：
- 检测 QP 模式（`=0D=0A`、`=3D`、`=[0-9A-Fa-f]{2}`）
- 解码 MIME Header
- UTF-8 / GBK 自动识别
- 清理残留编码字符

## License

Apache License 2.0 - 详见 [LICENSE](LICENSE) 文件
