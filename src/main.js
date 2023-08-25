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

const iconPath = path.join(__dirname, "src", "icons");
const icon = platformsNames[os.platform()] == 'WINDOWS' ? path.join(iconPath, 'icon.ico') : path.join(iconPath, 'icon.png');

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
  mainWindow.webContents.openDevTools();

  // Remove menu bar
  mainWindow.removeMenu();
};

const createTray = (installs) => {
  tray = new Tray(nativeImage.createFromPath(icon));

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
  ipcMain.handle('selectFolder', (event, startingFolder) => handleSelectFolder(startingFolder));
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
  if (window) {
    if (window.isMinimized()) window.restore()
    window.focus()
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
const handleSelectFolder = async (startingFolder) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Installation Folder',
    defaultPath: startingFolder,
    properties: ['openDirectory']
  });
  
  if (!canceled) return filePaths[0];
  return false;
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