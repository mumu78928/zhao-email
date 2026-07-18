# Email Client (zhao-email)

> 🌐 **Languages**: [简体中文](README.md) | [English](README.en.md)

> ## 🤖 AI Declaration
>
> This project was conceptualized and designed by **Zhao Youze**, with code implementation, debugging, and packaging assisted by an AI programming assistant (TRAE · MiniMax-M3).
> Core architectural decisions, business logic, and issue troubleshooting are human-led, while the AI assists with code implementation and technical suggestions.
> The project is owned by Zhao Youze and released under the Apache License 2.0.

---

A lightweight multi-account email client supporting IMAP/SMTP protocols, with out-of-the-box support for QQ, 163, Sina, 139, and other major Chinese email providers.
Built with React 18 + TypeScript + Vite + Express, packagable as a single-file Windows EXE.

## Features

- **Multi-Account Management** - Manage multiple email accounts in one interface with tab-based switching
- **Out-of-the-Box Support** - Pre-configured official authorization addresses for QQ, 163/126/yeah, Sina, and 139 mailboxes
- **IMAP Receive / SMTP Send** - Full support for email receiving and sending
- **Bulk Attachment Download** - One-click ZIP packaging of attachments across multiple emails (auto-organized by email subject)
- **Safe HTML Email Rendering** - Uses sandboxed iframe to prevent email content from breaking the page structure
- **Multi-Layer Encoding Decoding** - Full support for Quoted-Printable, MIME Header, and UTF-8 encoding
- **Single-File EXE Deployment** - Packaged via Node.js SEA, authorization codes stored locally, no privacy uploads

## Quick Start

### Option 1: Pre-compiled EXE (Recommended for Regular Users)

1. Go to [Releases](https://github.com/mumu78928/zhao-email/releases) and download the latest `zhao-email-vX.X.X-win-x64.zip`
2. Extract to any directory
3. Double-click `EmailClient.exe` to run (will automatically open browser to `http://localhost:3001` on first launch)
4. Configure your email account in the settings page (requires email authorization code, not login password)

### Option 2: Run from Source (For Developers)

#### Requirements

- Node.js 18+
- npm or pnpm

#### Installation & Launch

```bash
git clone https://github.com/mumu78928/zhao-email.git
cd zhao-email
npm install
npm run dev          # Starts both frontend and backend dev servers
```

Frontend runs at `http://localhost:5173`, backend API at `http://localhost:3001`.

#### Build Windows EXE (SEA Method)

```bash
npm run build:electron        # Build frontend and backend
# Then use postject to inject and generate single-file EXE
```

## Tech Stack

- **Frontend**: React 18.3.1 + TypeScript 5.8 + Vite 6.3 + TailwindCSS 3.4
- **Backend**: Express 4.21 + Node.js 18
- **Mail Protocols**: imap 0.8 (receive), nodemailer 9.0 (send), mailparser 3.9 (parse)
- **Packaging**: Vite + esbuild + Node.js SEA (Single Executable Application)
- **State Management**: Zustand
- **ZIP Packaging**: JSZip
- **Icons**: Lucide React

## Project Structure

```
zhao-email/
├── src/                    # React frontend source
│   ├── pages/              # Page components
│   │   ├── Inbox.tsx       # Inbox
│   │   ├── Compose.tsx     # Compose email
│   │   ├── Settings.tsx    # Email account settings
│   │   └── Home.tsx        # Home page
│   ├── components/         # Common components
│   │   ├── Sidebar.tsx     # Sidebar
│   │   ├── Empty.tsx       # Empty state
│   │   └── ErrorBoundary.tsx
│   ├── store/              # Zustand state management
│   ├── api/                # Frontend API client
│   └── lib/                # Utility functions
├── api/                    # Express backend
│   ├── routes/             # API routes (auth, email)
│   ├── services/           # Mail services (IMAP/SMTP wrapper)
│   ├── app.ts              # Express app config
│   └── server.ts           # Server entry
├── electron/               # Electron / SEA packaging
│   ├── main.cjs            # Electron main process
│   ├── build-server.mjs    # Backend esbuild bundler
│   └── sea-entry.cjs       # SEA entry
├── release/                # Build artifacts (gitignored)
└── dist/                   # Frontend build output (gitignored)
```

## Email Authorization Code

The authorization code is **not the login password** and must be enabled separately. Different providers have different methods:

- **QQ Mail**: https://service.mail.qq.com/ → Account → POP3/IMAP Service → Generate authorization code
- **163/126/yeah Mail**: https://mail.163.com/ → Settings → POP3/SMTP/IMAP → Client authorization password
- **Sina Mail**: https://mail.sina.com.cn/ → Settings → Client authorization code
- **139 Mail**: https://mail.10086.cn/ → Settings → Client authorization password

> **Note**: The authorization code is sensitive. Once configured, it is only stored in the browser's LocalStorage and is never uploaded to any server.

## Development Notes

### Port Conflicts

The backend runs on port `3001`, and the frontend dev server on `5173`. If ports are occupied:

```bash
# Windows PowerShell - release port 3001
Get-NetTCPConnection -LocalPort 3001 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### IMAP/SMTP Protocols

The project uses:
- **IMAP** for receiving emails (port 993, SSL)
- **SMTP** for sending emails (port 465, SSL)

All connections have timeout protection (IMAP 120s, SMTP 60s, attachment download 60s) and keepalive enabled to prevent frozen connections.

### Encoding Handling

For the special encodings used by Chinese email providers (especially Quoted-Printable encoding from 139 Mail and QQ Mail), multi-layer decoding is implemented:
- Detect QP patterns (`=0D=0A`, `=3D`, `=[0-9A-Fa-f]{2}`)
- Decode MIME Header
- Auto-detect UTF-8 / GBK
- Clean up residual encoded characters

## License

Apache License 2.0 - See [LICENSE](LICENSE) file for details
