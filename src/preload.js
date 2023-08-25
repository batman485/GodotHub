const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('system', {
    onAppReady: (callback) => ipcRenderer.on('appReady', callback),
    onDownloadProgress: (callback) => ipcRenderer.on('downloadProgress', callback),

    getOS: () => ipcRenderer.invoke('getOS'),
    getIsOnline: () => ipcRenderer.invoke('isOnline'),

    openFile: (file) => ipcRenderer.send('openFile', file),
    openFolder: (folder) => ipcRenderer.send('openFolder', folder),
    createFolder: (folder) => ipcRenderer.send('createFolder', folder),
    selectFolder: (startingFolder) => ipcRenderer.invoke('selectFolder', startingFolder),

    downloadRelease: (releaseId, releaseUrl, folder) => ipcRenderer.send('downloadRelease', releaseId, releaseUrl, folder),
});
contextBridge.exposeInMainWorld('storage', {
    signalStorageReady: (installs) => ipcRenderer.send('signalStorageReady', installs),
    onStorageReady: (callback) => ipcRenderer.on('storageReady', callback),

    onInstallsUpdated: (installs) => ipcRenderer.send('installsUpdated', installs),
    validateInstalls: (installs) => ipcRenderer.invoke('validateInstalls', installs),
    removeInstall: (location) => ipcRenderer.invoke('removeInstall', location),

    getDefaultInstallLocation: () => ipcRenderer.invoke('getDefaultInstallLocation'),
    getLastestRelease: () => ipcRenderer.invoke('getLastestRelease'),
    getAllReleases: () => ipcRenderer.invoke('getAllReleases'),
});