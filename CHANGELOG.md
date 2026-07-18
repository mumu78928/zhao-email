# 更新日志 | Changelog

> 🌐 **Languages**: [简体中文](#简体中文) | [English](#english)

---

## 简体中文

### [v1.0.2] - 2026-07-18

#### 修复
- **Edge 浏览器兼容性**：修复 HTML 邮件在 Edge 浏览器中无法显示的问题
  - 将 iframe 渲染方式从 `srcDoc` 改为 Blob URL，提升跨浏览器兼容性
  - 扩展 sandbox 权限，增加 `allow-popups` 支持邮件内链接点击
  - 添加加载失败时的错误处理和重试机制
- **浏览器兼容性**：Vite 构建目标扩展支持更多浏览器版本

### [v1.0.1] - 2026-07-17

#### 修复
- **HTML 邮件中文乱码**：修复网页邮箱（HTML 邮件）中中文显示为乱码的问题
  - 根本原因：`decodeString` 函数对已解码的 CJK 字符进行 binary 二次编码，丢失高位字节
  - 解决方案：在函数开头检测 CJK 字符，若已存在则直接返回，避免二次编码

### [v1.0.0] - 2026-07-17

#### 新增
- 多账户邮件管理（IMAP/SMTP）
- 支持 QQ、163/126/yeah、新浪、139 邮箱
- 附件批量下载（自动打包为 ZIP）
- HTML 邮件安全渲染（iframe 沙箱）
- 多层编码解码（QP、MIME、UTF-8）
- 单文件 EXE 部署，无需安装 Node.js

---

## English

### [v1.0.2] - 2026-07-18

#### Fixed
- **Edge browser compatibility**: Fixed HTML emails not displaying in Edge browser
  - Changed iframe rendering from `srcDoc` to Blob URL for better cross-browser compatibility
  - Extended sandbox permissions with `allow-popups` for email link clicks
  - Added error handling and retry mechanism for load failures
- **Browser compatibility**: Extended Vite build target to support more browser versions

### [v1.0.1] - 2026-07-17

#### Fixed
- **HTML email Chinese garbled text**: Fixed Chinese characters displaying as garbled text in HTML emails
  - Root cause: `decodeString` re-encoded already-decoded CJK characters via binary, truncating high bytes
  - Solution: Added CJK detection check at the start of `decodeString` to skip re-encoding

### [v1.0.0] - 2026-07-17

#### Added
- Multi-account email management (IMAP/SMTP)
- Support for QQ, 163/126/yeah, Sina, 139 mailboxes
- Bulk attachment download (auto-packaged as ZIP)
- Safe HTML email rendering (sandboxed iframe)
- Multi-layer encoding decoding (QP, MIME, UTF-8)
- Single-file EXE deployment, no Node.js installation required
