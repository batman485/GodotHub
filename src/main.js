const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, net, shell, dialog } = require('electron');
const AdmZip = require("adm-zip");
const request = require('request');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;
let tray;

const gitUser = 'godotengine';
const gitRepo = 'godot';

const mainPath = app.getAppPath().replace(`${path.sep}resources${path.sep}app.asar`, `${path.sep}..${path.sep}`);
const defaultInstallLocation = path.join(mainPath, 'installs') + path.sep;

const platforms = {
  WINDOWS: 'WINDOWS',
  MAC: 'MAC',
  LINUX: 'LINUX',
  SUN: 'SUN',
  OPENBSD: 'OPENBSD',
  ANDROID: 'ANDROID',
  AIX: 'AIX',
};

const platformsNames = {
  win32: platforms.WINDOWS,
  darwin: platforms.MAC,
  linux: platforms.LINUX,
  sunos: platforms.SUN,
  openbsd: platforms.OPENBSD,
  android: platforms.ANDROID,
  aix: platforms.AIX,
};

const state = {
  downloading: 'Downloading',
  unzipping: 'Unzipping',
  ready: 'Ready'
}

let isDialogOpen = false;

let isSingleInstance = app.requestSingleInstanceLock()
if (!isSingleInstance) {
  app.quit()
}

app.commandLine.appendSwitch('auto-detect', 'false');
app.commandLine.appendSwitch('no-proxy-server');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: true
    },
  });

  mainWindow.on('ready-to-show', () => mainWindow.show());

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();

  // Remove menu bar
  mainWindow.removeMenu();
};

const createTray = (installs) => {
  console.log(app.getAppPath());

  tray = new Tray(nativeImage.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAFh0lEQVR4Ac3Be2yV9RkH8O/zvL9zTjn00FKUtk5N6Vi1FN2MRGsdMhdjwgANs8HMEcBLg9h2iCIJirItMyZOZbC2wNQJZP7h1ox4AWYaOk6LXLxgIK3GRmeFNq2S055e3nN5z/v+Hkv2Nr47OeXUS5ifD/7fCJNUv/Nw8UgidZvWUjU9N1C3tebGEXg8/NejoS+G4g0G01tBv3q9ac38PkyCQhY1DeFZlq23nR1OLARgYExkJNkNYDM8Po/G19uOXpECViQsp2nFln/vD/h47fN1Cz7FeTCyiFvOVcmUsxiAAZej9dqHXzyaD9eGXcfyHa3X4iuGZTtL4pYzF1koZMGEKNKIIK8/Gjvy62cP4pyeiAkR5CGNwRRFFgpZGMz9gEY6R0s5smCmfmTBcG3cc5xXN7WVwWN1Y9tFttab8A3Ztt50f1PbDHjc39RWVrujneEiuJY/17rFdnS9X/GuKX610dEy20zafxeRS/EtEFFPMKCWKaaP45b9lGXru5XBW//20M8fwhjCmPv+HF45mkjtgosIERFMBZCD70aCCKYIZsCVm+Nb+UL9gj20urGtdDhunRRBLi4gIozmTw38mM2kvUQEubjARJA7Ek/dxhdNy9nORCdxgTHRqR/MCDYZx1570bl+yb3tKVuvAuDDBUCAGQr6F26rubHfwJgTB3adnXvriioAZfC4rmwmFs27HFdemo+zwwmMJlKYjOLpQdx+fQluuLIQymD0Rkykadn94M1bMYYxgbsWzMbaxRVQ0U/gG/gIm5ddjdLCELL5YdE0bF52NXwDH0JF/4PfLK7AXQtmYyIKGUzPDWDRvMvR2NCIvf/ci3Mq5lbg7gefwB/3nsS4ukUVEACN+zoxrrpqFjY9uhGdHZ04Z+kvl6K2rhb73z2DqJlEOkYGF+flgIkQPnQI4zo7OqGcGLwqryhE1RWF8DLsGDo7OjEufCgMJsLM/BxkwsigN2LCsjXK58zBuKKiIkQtA9kMWgpFRUUYVz6nHJat0RsxkYlCBmbCxu7WLmzYsAHNpc2IxWK46ZaF+Eu4G+kE/6v5yKd49Hd/QLjlAILBIKqrq7G7tQtmwkYmChNoPdWLrt4oriqpAidsbHnzM8QtB14H3juNdGeHE3juX6dxXdnPoAI+/L65Az0RExNROI+eiImeiImJvBz+GJnELRvhjj5MhoJrit94xtHSIkAxgYodrYtEUKZFSvAtMFE3EboM5n6B9BHQZzCfhEvBxUylACkinNJa3vT5jTOKeXQoZvXBgwh9+VMD6y3bceARUIYxaCafEUExPEJTfDfYWuc6Wi5j4mIRFAtkFoBDGKPgiiWdO0TkF3CxTd3ll4XKhk5bAoDgYqIjZsI+lnKcOnjYjjQw0RFH5A58RYoLgpGu3qGjWqQELiK8AeAljGG4mNAPDwEKHr/z2pRf8Ta/4lcMphaD6YTBdFwglSJYJ4J1IlgngnVaS6XBdNxgOmEwtfgVv+JXvO23v5qXAlAADyb6HC4FlzJ4v6Ode+ASkdADO9prY0n7IIEGpgVVRIsMTM8NDH72xeiTSKNFflIyM/TY4GhyNxMVmAl7hkAK1mxvrx0cTYbgoQzeB5eC60eX5O394Mxgu9YyH/9FAyPJBrjilo1zBkaSAoCQxtHyyCd9w+sBEDwSlgMvZmorLZz2KlwGXK3/2Cnzl9a8kUzpmwW4BBMjTIxwHkz0tt/Ht//pvioTLgMe7+x7KfbTpTV7AGhHy7UA/PgOEGHEp/ipmXlT7t3xwE0j8CBMoH7n4QIzaS+3HalO2U6lAD58DQRYSvFRn8HNAZ/x8vY18weRAWES6ncenhq3nGtsreeIoERECm0teSKSgzFElFBMQ0TUz0TdBtMHBaHA+0+vqozh++5LymlcWaHXLtoAAAAASUVORK5CYII="));

  tray.on('click', (event, bounds, position) => {
    mainWindow.show();
  });

  tray.setToolTip('Godot Hub');
  tray.setContextMenu(Menu.buildFromTemplate(createTrayContext(installs)));
}

const createTrayContext = (installs) => {
  let context = [];

  if(installs.length > 0) {
    installs.forEach((install) => {
      const name = install.name.replace('-stable', '');
      const type = install.type.charAt(0).toUpperCase() + install.type.slice(1);
      context.push({ label: `Godot ${name} ${type}`, type: 'normal', click: () => shell.openPath(install.location) });
    });

    context.push({ label: '', type: 'separator' });
  }

  context.push({ label: 'Quit', type: 'normal', click: () => app.quit() });
  return context;
}

//App Events
app.on('ready', () => {
  ipcMain.handle('isOnline', (event) => net.isOnline());
  ipcMain.handle('getOS', (event) => platformsNames[os.platform()]);
  ipcMain.handle('getArch', (event) => os.arch());
  ipcMain.handle('selectFolder', (event, startingFolder) => selectFolder(startingFolder));
  ipcMain.handle('removeInstall', (event, install) => removeInstall(install));
  ipcMain.handle('validateInstalls', (event, installs) => validateInstalls(installs));
  ipcMain.on('installsUpdated', (event, installs) => tray.setContextMenu(Menu.buildFromTemplate(createTrayContext(installs))));
  
  ipcMain.on('openFile', (event, file) => openFile(file));
  ipcMain.on('openFolder', (event, folder) => openFolder(folder));
  ipcMain.on('createFolder', (event, folder) => createFolder(folder));
  ipcMain.on('downloadRelease', (event, releaseId, releaseUrl, folder) => downloadFile(releaseId, releaseUrl, folder));
  
  ipcMain.handle('getDefaultInstallLocation', () => defaultInstallLocation);
  ipcMain.handle('getLastestRelease', getLastestRelease);
  ipcMain.handle('getAllReleases', getAllReleases);
  
  ipcMain.on('signalStorageReady', (event, installs) => {
    mainWindow.webContents.send('storageReady');
    createTray(installs);
  });

  createWindow();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.on('before-quit', function (evt) {
  tray.destroy();
});
app.on('second-instance', (event, argv, cwd) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
  }
});

//System Functions
const openFile = (file) => {
  shell.openPath(file);
  mainWindow.hide();
}
const openFolder = (folder) => {
  const folderPath = path.parse(folder).dir;

  if (fs.existsSync(folderPath)) 
    shell.openPath(folderPath);
}
const createFolder = (folder) => {
  if (!fs.existsSync(folder)) 
    fs.mkdirSync(folder);
}
const removeInstall = async (install) => {
  const folder = path.dirname(install);

  if (fs.existsSync(folder))
    fs.rmSync(folder, {recursive: true, force: true});

  return true;
}
const selectFolder = async (startingFolder) => {
  if(!isDialogOpen) {
    isDialogOpen = true;

    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Installation Folder',
      defaultPath: startingFolder,
      properties: ['openDirectory']
    });

    isDialogOpen = false;
    
    if (!canceled) return filePaths[0];
    return false;
  }
  
}

const downloadFile = (releaseId, releaseUrl , targetPath) => {
  const fileName = getFilenameFromUrl(releaseUrl);
  const filePath = path.join(targetPath, fileName);

  var receivedBytes = 0;
  var totalBytes = 0;

  var req = request({method: 'GET', uri: releaseUrl});

  var out = fs.createWriteStream(filePath);
  req.pipe(out);

  req.on('response', function ( data ) {
      totalBytes = parseInt(data.headers['content-length' ]);
  });

  req.on('data', function(chunk) {
      receivedBytes += chunk.length;
      updateDownloadProgress(releaseId, receivedBytes, totalBytes);
  });

  req.on('end', function() {
      let zipFolder = filePath.replace('.zip', '');
      if(platformsNames[os.platform()] == 'WINDOWS') {
        zipFolder = zipFolder.replace('.exe', '');
      }

      mainWindow.webContents.send('downloadProgress', releaseId, state.unzipping, 100, '');
      unzipFile(releaseId, filePath, zipFolder);
  });
}

const updateDownloadProgress = (releaseId,received,total) => {
  var percentage = (received * 100) / total;

  mainWindow.setProgressBar(percentage/100);
  mainWindow.webContents.send('downloadProgress', releaseId, state.downloading, percentage, '');
}

const unzipFile = (releaseId,zipFile,unzipPath) => {
  const zip = new AdmZip(zipFile);

  const zipEntries = zip.getEntries();
  const exe = zipEntries.find((entry) => !entry.entryName.includes('_console')).entryName;

  zip.extractAllTo(unzipPath, true);
  finalizeZipExtraction(releaseId, zipFile, path.join(unzipPath, exe));
}

const finalizeZipExtraction = (releaseId, zipFile, exe) => {
  console.log(`${exe} extracted`);
  mainWindow.webContents.send('downloadProgress', releaseId, state.ready, 100, exe);

  mainWindow.setProgressBar(-1);
  fs.unlink(zipFile, () => {});
}

const getFilenameFromUrl = (url) => {
  return url.substring(url.lastIndexOf('/') + 1);
}

//Validations
const validateInstalls = async (installs) => {
  let validInstalls = installs;
  for (let i = 0; i < installs.length; i++) {
    if(!fs.existsSync(installs[i].location))
      validInstalls.splice(i,1);
  }

  return validInstalls;
}

//Github API Functions
const getLastestRelease = async () => {
  if(net.isOnline()) {
    const response = await net.fetch(`https://api.github.com/repos/${gitUser}/${gitRepo}/releases/latest`);
    if (response.ok) {
      const repo = await response.json();
      return repo.id;
    }
  }

  return -1;
}
const getAllReleases = async () => {
  if(net.isOnline()) {
    const response = await net.fetch(`https://api.github.com/repos/${gitUser}/${gitRepo}/releases`);
    if (response.ok) {
      return await response.json();
    }
  }

  return {};
}