const { install } = require("./content");

const storageKey = {
    settings: "settings",
    installs: "installs",
    releases: "releases",
    latestRelease: "latest",
    installLocation: "location"
}
const extensions = {
    'WINDOWS': {
        'standard_32': '_win32.exe.zip',
        'standard_64': '_win64.exe.zip',
        'mono_32': '_mono_win32.zip',
        'mono_64': '_mono_win64.zip',
    },
    'MAC': {
        'standard': '_macos.universal.zip',
        'mono': '_mono_macos.universal.zip',
    }
}

let os = '';
let isOnline = false;
let settings = {arch: '64', type: 'standard', location: ''};

let installs = [];
let installIds = [];
let releases = [];
let latestRelease = 0;

const getRelease = (releaseId) => {
    return releases.find((release) => release.id == releaseId);
}

const setSettings = async (newSettings) => {
    settings = newSettings;
    await localStorage.setItem(storageKey.settings, JSON.stringify(settings));
}

const addInstall = async (id, name, location, type, arch) => {
    const intId = parseInt(id);
    installs.push({id: intId, name, location, lastUsed: Date.now(), type, arch});
    await handleInstallsUpdated();
}
const removeInstall = async (id) => {
    const installIndex = installs.findIndex((install) => install.id == id);
    if(installIndex >= 0) {
        installs.splice(installIndex, 1);
        await handleInstallsUpdated();
    }
}
const updateLastUsed = async (id) => {
    const installIndex = installs.findIndex((install) => install.id == id);
    if(installIndex >= 0) {
        installs[installIndex].lastUsed = Date.now();
        await handleInstallsUpdated();
    }
}
const handleInstallsUpdated = async () => {
    installs.sort(sortInstalls);

    let ids = installs.map((install) => install.id);
    installIds = ids;

    await localStorage.setItem(storageKey.installs, JSON.stringify(installs));
    window.storage.onInstallsUpdated(installs);
}

const sortReleases = (a,b,latest) => {
    if(b['id'] == latest) return 1;
    if(a['id'] == latest) return -1;

    if(b['version'] > a['version']) return 1;
    if(a['version'] > b['version']) return -1;

    return b['id'] - a['id'];
}

const sortInstalls = (a,b) => {
    if(b['lastUsed'] > a['lastUsed']) return 1;
    if(a['lastUsed'] > b['lastUsed']) return -1;
}

const setupStorage = async () => {
    os = await window.system.getOS();
    isOnline = await  window.system.getIsOnline();

    const settingsDefault = settings;
    settings = await JSON.parse(localStorage.getItem(storageKey.settings)) || settingsDefault;
    if(settings.location == '') {
        settings.location = await window.storage.getDefaultInstallLocation();
        await localStorage.setItem(storageKey.settings, JSON.stringify(settings));
    }

    window.system.createFolder(settings.location);
    
    let storedLatestRelease = await parseInt(localStorage.getItem(storageKey.latestRelease)) || 0;
    storedLatestRelease = 0;

    if(isOnline) {
        const gitLatestRelease = await  window.storage.getLastestRelease();

        if(gitLatestRelease != storedLatestRelease) {
            await localStorage.setItem(storageKey.latestRelease, gitLatestRelease);
            storedLatestRelease = gitLatestRelease;
            
            let newReleases = [];
            const gitReleases = await window.storage.getAllReleases();

            if(gitReleases && gitReleases != {}) {
                gitReleases.forEach(release => {
                    let version = parseInt(release.name[0]);
                    if(version > 2 && release.assets.length > 0) {
                        let validRelease = {
                            id: release.id,
                            name: release.name,
                            version: version,
                            created: new Date(release.created_at).getTime(),
                            published: new Date(release.published_at).getTime(),
                            downloads: {}
                        };

                        Object.keys(extensions[os]).forEach((extension) => {
                            const foundAsset = release.assets.find((asset) => {
                                return asset.name.endsWith(extensions[os][extension]);
                            });

                            if(foundAsset) {
                                validRelease.downloads[extension] = foundAsset.browser_download_url;
                            }
                        });

                        newReleases.push(validRelease);
                    }
                });
            }

            await localStorage.setItem(storageKey.releases, JSON.stringify(newReleases));
        }
    }

    releases = await JSON.parse(localStorage.getItem(storageKey.releases)) || {};
    installs = await JSON.parse(localStorage.getItem(storageKey.installs)) || [];    
    latestRelease = storedLatestRelease;

    if(releases != {}) releases.sort((a,b) => sortReleases(a,b,storedLatestRelease));
    if(installs != []) {
        installs.sort(sortInstalls);

        const validInstalls = await window.storage.validateInstalls(installs);
        if(installs != validInstalls) {
            installs = validInstalls;

            if(installs.length > 0) await localStorage.setItem(storageKey.installs, JSON.stringify(installs));
            else await localStorage.removeItem(storageKey.installs);
        }
    }

    installIds = installs.map((install) => install.id);

    window.storage.signalStorageReady(installs);
}

module.exports = {
    setup: setupStorage,
    addInstall: (id, name, location, type, arch) => addInstall(id, name, location, type, arch),
    getIsOnline: () => isOnline,
    getInstalls: () => installs,
    removeInstall: (id) => removeInstall(id),
    getInstallIds: () => installIds,
    getSettings: () => settings,
    setSettings: (newSettings) => setSettings(newSettings),
    setSettingArch: (arch) => setSettings({arch, type: settings.type, location: settings.location}),
    setSettingType: (type) => setSettings({arch: settings.arch, type, location: settings.location}),
    setSettingLocation: (location) => setSettings({arch: settings.arch, type: settings.type, location}),
    getInstallLocation: () => settings.location,
    getReleases: () => releases,
    getRelease: (releaseId) => getRelease(releaseId),
    getLatestRelease: () => latestRelease,
    updateLastUsed: (id) => updateLastUsed(id)
}