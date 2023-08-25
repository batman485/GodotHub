import "./index.css";
import storage from './js/storage';
import content from './js/content';

const cover = document.getElementById("cover");

const releaseModal = document.getElementById("release-modal");
const releaseModalButton = document.getElementById("release-modal-button");

const installModal = document.getElementById("install-modal");
const installTitle = document.getElementById("install-modal-title");
const installFolderButton = document.getElementById("install-modal-selectfolder");
const installFolderText = document.getElementById("install-modal-folder");
const installVersionSelect = document.getElementById("version");
const installArchSelect = document.getElementById("arch");
const installButton = document.getElementById("install");

const uninstallModal = document.getElementById("uninstall-modal");
const uninstallTitle = document.getElementById("uninstall-modal-title");
const uninstallMessage = document.getElementById("uninstall-modal-message");
const uninstallButton = document.getElementById("uninstall");

const installList = document.getElementById("install-list");
const releaseList = document.getElementById("release-list");
const downloadList = document.getElementById("download-list");

const xdata = {
    id: 'x-data-id',
    name: 'x-data-name',
    location: 'x-data-location'
}

let downloadListItem = {};
let installOptions = {id: 0, arch: '64', type: 'standard', location: ''};
let uninstallOptions = {id: 0, name: '', location: ''};

const setup = () => {
    setupLists();
    setupReleaseModal();
    setupUninstallModal();
    setupListButtons();

    if(storage.getIsOnline()) {
        releaseModalButton.disabled = false;
    }
}

const setupLists = () => {
    installList.innerHTML = generateInstallListHTML();
    releaseList.innerHTML = generateReleaseListHTML();
}

const generateInstallListHTML = () => {
    let installListHTML = "";

    const installs = storage.getInstalls();
    installs.forEach((install) => {
        const lastUsed = new Date(install.lastUsed).toLocaleString('en-US').replace(',', '').split(' ')[0];

        let html = content.install.listItem.replace(new RegExp('{{NAME}}','g'), install.name.replace('-stable', ''));
        html = html.replace(new RegExp('{{LOCATION}}','g'), install.location);
        html = html.replace(new RegExp('{{ID}}','g'), install.id);
        html = html.replace('{{LAST}}', lastUsed);
        html = html.replace('{{TYPE}}', install.type);

        installListHTML += html;
    });

    return installListHTML;
}
const generateReleaseListHTML = () => {
    let releaseListHTML = "";

    const latestRelease = storage.getLatestRelease();
    const installedIds = storage.getInstallIds();
    const releases = storage.getReleases();

    releases.forEach((release) => {
        if(!installedIds.includes(release.id)) {
            const created = new Date(release.created).toLocaleString('en-US').replace(',', '');
        
            let html = content.release.listItem.replace(new RegExp('{{NAME}}','g'), release.name.replace('-stable', ''));
            html = html.replace(new RegExp('{{LATEST_HIDDEN}}','g'), release.id == latestRelease ? '' : 'hidden ');
            html = html.replace(new RegExp('{{CREATED}}','g'), created);
            html = html.replace(new RegExp('{{ID}}','g'), release.id);

            releaseListHTML += html;
        }
    });
    return releaseListHTML;
}

const setupListButtons = () => {
    document.querySelectorAll(".list-menu-button").forEach(function (el) {
        const nextEl = el.nextElementSibling;
    
        el.addEventListener("click", (e) => {
            nextEl.classList.add("list-menu-opened");
            nextEl.focus();
        });

        nextEl.addEventListener("focusout", (e) => {
            setTimeout(() => {
                if (!nextEl.contains(document.activeElement))
                    nextEl.classList.remove("list-menu-opened");
            }, 0);
        });
    });
    document.querySelectorAll(".list-menu-explorer").forEach(function (el) {
        el.addEventListener("click", (e) => {
            const location = el.getAttribute(xdata.location);
            window.system.openFolder(location);

            el.parentElement.classList.remove("list-menu-opened");
        });
    });
    document.querySelectorAll(".list-menu-uninstall").forEach(function (el) {
        el.addEventListener("click", (e) => {
            const id = el.getAttribute(xdata.id);
            const name = el.getAttribute(xdata.name);
            const location = el.getAttribute(xdata.location);

            uninstallOptions = {id, name, location};

            uninstallTitle.innerHTML = `Uninstall ${name}`;
            uninstallMessage.innerHTML = `Are you sure you wish to uninstall Godot ${name}?`;
            uninstallModal.classList.remove('hidden');
        });
    });
    document.querySelectorAll(".install-launch").forEach(function (el) {
        el.addEventListener("click", async (e) => {
            el.disabled = true;

            const location = el.getAttribute(xdata.location);
            const id = el.getAttribute(xdata.id);

            openInstall(location);

            await storage.updateLastUsed(id);
            setup();

            el.disabled = false;
        });
    });
}

const setupReleaseModal = () => {
    const settings = storage.getSettings();

    installFolderText.title = settings.location;
    installFolderText.innerHTML = settings.location;

    installArchSelect.value = settings.arch;
    installVersionSelect.value = settings.type;

    releaseModalButton.addEventListener("click", (e) => {
        releaseModal.classList.remove("hidden");
    });
    
    document.querySelectorAll(".release-modal-install").forEach(function (el) {
        el.addEventListener("click", (e) => {
            const name = el.getAttribute(xdata.name);
            installOptions.id = el.getAttribute(xdata.id);

            installTitle.innerText = `Install ${name}`;
            installModal.classList.remove("hidden");
        });
    });

    document.querySelectorAll(".release-modal-close").forEach(function (el) {
        el.addEventListener("click", (e) => {
            releaseModal.classList.add("hidden");
        });
    });

    installFolderButton.addEventListener("click", async (e) => {
        cover.classList.remove('hidden');

        const filePath = await window.system.selectFolder(storage.getInstallLocation());
        if(filePath) {
            installFolderText.innerText = filePath;
            installFolderText.title = filePath;

            installOptions.location = filePath;
            storage.setSettingLocation(filePath);
        }

        cover.classList.add('hidden');
    });
    installVersionSelect.addEventListener("change", (event) => {
        const type = event.target.value;
        installOptions.type = type;
        storage.setSettingType(type);
    });
    installArchSelect.addEventListener("change", (event) => {
        const arch = event.target.value;
        installOptions.arch = arch;
        storage.setSettingArch(arch);
    });

    installButton.addEventListener("click", (e) => {
        installButton.disabled = true;

        if(!(installOptions.id in downloadListItem)) {
            const release = storage.getRelease(installOptions.id);
            if(release) {
                const downloadUrl = release.downloads[`${installOptions.type}_${installOptions.arch}`];
                addDownloadItem(release.id, release.name);

                window.system.downloadRelease(installOptions.id, downloadUrl, storage.getInstallLocation());

                installModal.classList.add('hidden');
                releaseModal.classList.add('hidden');
            } else {
                console.log(`Release ${installOptions.id} not found`);
            }
        }

        installButton.disabled = false;
    });

    document.querySelectorAll(".install-modal-close").forEach(function (el) {
        el.addEventListener("click", (e) => {
            installModal.classList.add("hidden");
            installOptions.id = 0;
        });
    });
}

const setupUninstallModal = () => {
    uninstallButton.addEventListener("click", async (e) => {
        uninstallButton.disabled = true;
        uninstallButton.innerHTML = "Uninstalling..."

        await removeInstall();
        
        uninstallModal.classList.add('hidden');
        uninstallButton.disabled = false;
        uninstallButton.innerHTML = "Uninstall";

        setup();
    });

    document.querySelectorAll(".uninstall-modal-close").forEach(function (el) {
        el.addEventListener("click", (e) => {
            uninstallModal.classList.add("hidden");
            uninstallOptions = {id: 0, name: '', location: ''};
        });
    });
}

const addDownloadItem = (id, name) => {
    let html = content.install.downloadItem.replace(new RegExp('{{NAME}}','g'), name.replace('-stable', ''));
    const el = content.htmlToElem(html);
    const elState = el.querySelector('.download-state');
    const elProgress = el.querySelector('.download-progress');

    downloadList.appendChild(el);
    downloadListItem[id] = {
        name: name,
        state: 'Starting',
        type: installOptions.type,
        arch: installOptions.arch,
        el: {
            main: el,
            state: elState,
            progress: elProgress
        }
    };
}

const updateDownloadItem = async (id, state, progress, file) => {
    if(downloadListItem[id].state != 'Ready') {
        downloadListItem[id].state = state;
        downloadListItem[id].el.state.innerHTML = state;
        downloadListItem[id].el.progress.style["width"] = `${progress}%`;

        if(state == 'Ready') {
            await storage.addInstall(id, downloadListItem[id].name, file, downloadListItem[id].type, downloadListItem[id].arch);
            downloadList.removeChild(downloadListItem[id].el.main);
            delete downloadListItem[id];

            setup();
        }
    }
}

const removeInstall = async () => {
    const success = await window.storage.removeInstall(uninstallOptions.location);
        
    if(success) {
        await storage.removeInstall(uninstallOptions.id);
    }
}
const openInstall = (location) => window.system.openFile(location);

window.system.onDownloadProgress((_event, id, state, progress, file) => updateDownloadItem(id, state, progress, file));
window.storage.onStorageReady((_event) => setup());
storage.setup();