# 开源 EmailClient 项目到 GitHub 计划

## 1. Summary

将当前 `EmailClient` 项目初始化为 Git 仓库，推送到 GitHub 新仓库 `mumu78928/zhao-email`：
- **main 分支**：只放源代码（不含 release/ 编译产物）
- **Release v1.0.0**：将 `release/EmailClient/` 整个目录打包为 `EmailClient-v1.0.0-win-x64.zip` 上传作为可运行版本
- 仓库使用 **Apache 2.0** 许可证

## 2. Current State Analysis

通过探索发现：

- **项目结构**：
  - 源码：`src/`（React 18 + TS + Vite）、`api/`（Express 后端）、`electron/`（Electron 打包脚本）
  - 编译产物：`dist/`（前端打包）、`electron/server.cjs`、`electron/sea-bundle.cjs`
  - 可运行版本：`release/EmailClient/`（含 `EmailClient.exe`、`node.exe`、`sea-bundle.cjs`、`server.cjs`、`dist/`）
  - 配置文件：`package.json`、`vite.config.ts`、`tailwind.config.js`、`sea-config.json` 等
  - 辅助文件：`certificate.pfx`、`zhao-cert.cer`（签名证书）、`build-exe.ps1`、`create-cert.ps1`（构建脚本）

- **Git 状态**：项目根目录**没有 `.git` 目录**，是全新仓库

- **现有 `.gitignore`**：已忽略 `node_modules`、`dist`、`dist-ssr`、`*.local`、IDE 临时文件，**但没有忽略**：
  - `release/EmailClient/`（编译产物 EXE）
  - `release/*.txt`（测试日志）
  - `*.pfx`、`*.cer`（证书文件 - 私钥敏感，不应上传）
  - `.pkg-cache/`（pkg 缓存）
  - `sea-prep.blob`（SEA 中间产物）
  - `executable-output.log` 之类的临时日志

- **现有 `README.md`**：是 Vite 模板默认内容，需要重写为项目说明

- **`package.json`**：
  - name: `email-client`，version: `1.0.0`，author: `Zhao Youze`
  - main: `electron/main.cjs`
  - 含完整的 build（electron-builder）、dev、build 脚本
  - 依赖完整：jszip、imap、nodemailer、mailparser、react、express 等

## 3. Proposed Changes

### 3.1 更新 `.gitignore`（覆盖现有文件）

**文件**：`C:\Users\帅哥\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a58e156e1addaff38419143\.gitignore`

**原因**：当前 .gitignore 缺少 release 产物、证书、临时日志等规则，会污染主分支。

**新增规则**：
```gitignore
# 依赖与构建产物
node_modules
dist
dist-ssr
*.local
.pkg-cache
sea-prep.blob
server.cjs
sea-bundle.cjs
electron/server.cjs
electron/sea-bundle.cjs

# Release 目录下的 EXE 产物（源代码主分支不包含）
release/EmailClient/
release/*.txt
release/test-*.txt
release/exe-*.txt

# 证书（包含私钥，不上传）
*.pfx
*.cer
*.p12

# 测试输出
test-*.txt
exe-*.txt
test-direct-*.txt

# 编辑器/临时
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
.vite

# 日志
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*
```

### 3.2 替换 `README.md`（覆盖现有文件）

**文件**：`C:\Users\帅哥\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a58e156e1addaff38419143\README.md`

**原因**：当前是 Vite 默认模板，需要改为项目说明。

**内容结构**：
```markdown
# Email Client (zhao-email)

一个轻量级多账户邮件客户端，支持 IMAP/SMTP 协议，QQ、163、新浪、139 等主流邮箱开箱即用。
基于 React 18 + TypeScript + Vite + Express 构建，可打包为单文件 Windows EXE。

## 特性
- 多账户统一管理
- IMAP 收件、SMTP 发件
- 附件批量下载（自动打包为 ZIP）
- HTML 邮件渲染（iframe 沙箱隔离）
- 多层编码解码（Quoted-Printable、MIME、UTF-8）
- 单文件 EXE 部署，邮箱授权码本地存储

## 快速开始
### 方式一：使用预编译 EXE（推荐普通用户）
1. 前往 [Releases](https://github.com/mumu78928/zhao-email/releases) 下载最新版本的 `EmailClient-vX.X.X-win-x64.zip`
2. 解压后双击 `EmailClient.exe` 运行
3. 在设置页面配置邮箱账户（需要邮箱授权码）

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

#### 打包 Windows EXE
```bash
npm run build:electron       # 构建前端和后端
npm run electron:build       # 调用 electron-builder 打包
# 或使用 SEA（Single Executable Application）方式：
node electron/build-server.mjs
# 然后用 postject 将 sea-prep.blob 注入 node.exe
```

## 技术栈
- 前端：React 18.3.1 + TypeScript 5.8 + Vite 6.3 + TailwindCSS 3.4
- 后端：Express 4.21 + Node.js 18
- 邮件协议：imap 0.8（接收）、nodemailer 9.0（发送）、mailparser 3.9（解析）
- 打包：Vite + esbuild + SEA + electron-builder
- 状态管理：Zustand

## 项目结构
```
src/          # React 前端源码
  pages/      # 页面组件（Inbox、Compose、Settings）
  components/ # 通用组件
  store/      # Zustand 状态
  api/        # 前端 API 客户端
api/          # Express 后端
  routes/     # API 路由
  services/   # 邮件服务（IMAP/SMTP）
electron/     # Electron 打包相关
release/      # 编译产物（已 gitignore）
dist/         # 前端构建输出（已 gitignore）
```

## 邮箱授权码获取
不同邮箱服务商的授权码获取方式不同，请参考：
- QQ 邮箱：https://service.mail.qq.com/
- 163 邮箱：https://mail.163.com/
- 新浪邮箱：https://mail.sina.com.cn/
- 139 邮箱：https://mail.10086.cn/

## License
Apache License 2.0
```

### 3.3 新增 `LICENSE` 文件

**文件**：`C:\Users\帅哥\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a58e156e1addaff38419143\LICENSE`

**原因**：Apache 2.0 许可证要求随项目分发完整 LICENSE 文件。

**内容**：Apache License 2.0 标准文本（Copyright 2026 Zhao Youze）

### 3.4 初始化 Git 仓库并提交

**执行步骤**：

1. `git init`（在项目根目录初始化）
2. `git config user.name "Zhao Youze"`（如果尚未配置）
3. `git config user.email "..."`（使用 GitHub 账户邮箱，如果未配置）
4. `git add .`（受 .gitignore 控制）
5. `git status` 验证仅源代码被暂存
6. 使用 `git-commit` 技能创建提交：
   ```
   chore: initial release v1.0.0
   ```

### 3.5 在 GitHub 创建仓库并推送

**方式**：使用 `gh` CLI（GitHub CLI）创建仓库并推送。

**步骤**：
1. 检查 `gh` 是否已安装并登录
2. `gh repo create mumu78928/zhao-email --public --description "轻量级多账户邮件客户端" --source . --remote origin --push`
3. 验证 `git log` 和 `git remote -v`

### 3.6 创建 GitHub Release 并上传 EXE 压缩包

**步骤**：
1. 创建临时打包目录
2. 将 `release/EmailClient/` 整个文件夹压缩为 `EmailClient-v1.0.0-win-x64.zip`
3. `gh release create v1.0.0 ./EmailClient-v1.0.0-win-x64.zip --title "EmailClient v1.0.0" --notes "首次发布，包含完整的 Windows 可运行版本"`
4. 验证 Release 页面已生成

## 4. Files to be Created / Modified

| 操作 | 路径 | 原因 |
|------|------|------|
| 修改 | `.gitignore` | 补充缺失的 release/证书/日志规则 |
| 覆盖 | `README.md` | 替换为项目说明文档 |
| 新建 | `LICENSE` | Apache 2.0 许可证全文 |
| 新建 | `.git/` | `git init` 生成 |

## 5. Assumptions & Decisions

- **DECISION 1**：源代码主分支**不包含** `release/EmailClient/` 编译产物。理由：EXE 文件体积大且每次构建都会变化，违反 .gitignore 原则。EXE 通过 GitHub Release 分发。
- **DECISION 2**：证书文件 `*.pfx` 和 `*.cer` **不上传**。理由：包含私钥，公开后存在安全风险。用户本地构建时使用自签名证书。
- **DECISION 3**：使用 `gh` CLI 创建仓库和 Release。理由：已集成 GitHub 认证，比手动网页操作更可靠。
- **DECISION 4**：commit message 使用 `chore: initial release v1.0.0`，符合 Conventional Commits 规范。
- **DECISION 5**：`package.json` 已有 `version: 1.0.0`，与 Release tag 保持一致。

## 6. Verification Steps

执行完成后验证：
1. `git log --oneline` 应显示一个 commit
2. `git status` 应显示 clean working tree
3. 浏览器访问 `https://github.com/mumu78928/zhao-email` 应能看到项目主页和 README 渲染
4. 访问 `https://github.com/mumu78928/zhao-email/releases` 应能看到 v1.0.0 Release 和 EXE 压缩包附件
5. 下载 `EmailClient-v1.0.0-win-x64.zip` 解压后能正常双击 `EmailClient.exe` 运行
6. `git ls-files` 验证关键源码文件全部入库：
   - `src/pages/Inbox.tsx`、`src/pages/Compose.tsx`、`src/pages/Settings.tsx`
   - `api/services/emailService.ts`、`api/services/emailConfig.ts`
   - `electron/main.cjs`、`electron/sea-entry.cjs`
   - `package.json`、`vite.config.ts`、`tailwind.config.js`
   - `README.md`、`LICENSE`
   - **不包含**：`release/EmailClient/EmailClient.exe` 等
