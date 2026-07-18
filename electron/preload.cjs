const { contextBridge } = require('electron');

// 通过contextBridge暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
});