const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

const DB_FILE = path.join(__dirname, 'db.json');

const http = require('http');

let server;
function startLocalServer() {
  server = http.createServer((req, res) => {
    let rawUrl = req.url.split('?')[0];
    if (rawUrl === '/') rawUrl = '/index.html';

    const filePath = path.join(__dirname, rawUrl);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end(JSON.stringify(err));
        return;
      }
      res.writeHead(200);
      res.end(data);
    });
  });
  server.listen(3000, () => {
    console.log("Local development server started on http://localhost:3000");
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadURL('http://localhost:3000');
  win.removeMenu();
}

ipcMain.on('window-control', (event, action) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (action === 'minimize') {
    win.minimize();
  } else if (action === 'maximize') {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  } else if (action === 'close') {
    win.close();
  }
});

const { shell } = require('electron');
ipcMain.on('open-external', (event, url) => {
  if(url) shell.openExternal(url);
});

app.whenReady().then(() => {
  startLocalServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('auraplayer', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('auraplayer')
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {

    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()

      const url = commandLine.find(arg => arg.startsWith('auraplayer://'));
      if (url) {
        mainWindow.webContents.send('on-deep-link', url);
      }
    }
  })
}

app.on('open-url', (event, url) => {
  event.preventDefault();
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    mainWindow.webContents.send('on-deep-link', url);
  } else {

    app.whenReady().then(() => {

      setTimeout(() => {
        const win = BrowserWindow.getAllWindows()[0];
        if(win) win.webContents.send('on-deep-link', url);
      }, 1000);
    });
  }
});