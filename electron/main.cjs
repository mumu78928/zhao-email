const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow = null;
let serverProcess = null;

function getStaticPath() {
  // 打包后路径: resources/app/dist
  // 开发时路径: 项目根目录/dist
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app', 'dist');
  }
  return path.join(__dirname, '..', 'dist');
}

function getServerPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app', 'dist-electron', 'server.cjs');
  }
  return path.join(__dirname, 'server.cjs');
}

function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = getServerPath();
    const staticPath = getStaticPath();

    process.env.SERVE_STATIC = 'true';
    process.env.STATIC_PATH = staticPath;
    process.env.PORT = '3001';

    serverProcess = fork(serverPath, [], {
      cwd: app.isPackaged ? path.join(process.resourcesPath, 'app') : path.join(__dirname, '..'),
      env: {
        ...process.env,
        SERVE_STATIC: 'true',
        STATIC_PATH: staticPath,
        PORT: '3001',
      },
      stdio: 'pipe',
    });

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log('[Server]', msg.trim());
      if (msg.includes('Server ready')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('[Server Error]', data.toString().trim());
    });

    serverProcess.on('error', (err) => {
      console.error('[Server Process Error]', err);
      reject(err);
    });

    // 超时保护
    setTimeout(() => resolve(), 5000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: '简易邮箱客户端',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // 加载本地服务器
  mainWindow.loadURL('http://localhost:3001');

  // 外部链接在系统浏览器中打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await startServer();
  } catch (err) {
    console.error('启动服务器失败:', err);
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});