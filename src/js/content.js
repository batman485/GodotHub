const installListItem = ''+
'<li class="flex justify-between gap-x-6 py-5 border-b border-gray-800">'+
'    <div class="flex min-w-0 gap-x-4">'+
'        <div class="min-w-0 flex-auto">'+
'           <p class="text-xl font-semibold leading-6 text-white">{{NAME}} &#183; <span class="capitalize">{{TYPE}}</span></p>'+
'           <p class="mt-1 w-full max-w-sm text-sm leading-5 text-gray-400">Last Used: {{LAST}}</p>'+
'        </div>'+
'    </div>'+
'    <div class="flex shrink-0 items-center gap-x-6">'+
'        <div class="text-center">'+
'           <button type="button" x-data-location="{{LOCATION}}" x-data-id="{{ID}}" class="install-launch ml-3 inline-flex items-center rounded-md bg-indigo-500 px-8 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">Launch</button>'+
'        </div>'+
'        <div class="relative flex-none">'+
'           <button type="button" class="list-menu-button -m-2.5 block p-2.5 text-gray-500 hover:text-white" aria-expanded="false" aria-haspopup="true">'+
'               <span class="sr-only">Open options</span>'+
'               <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">'+
'                   <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />'+
'               </svg>'+
'           </button>'+
'           <div class="list-menu absolute right-0 z-10 mt-2 w-32 origin-top-right rounded-md py-1 bg-white shadow-lg ring-1 ring-gray-900/5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="options-menu-button" tabindex="0">'+
'               <button type="button" class="list-menu-explorer block w-32 px-3 py-1 text-sm leading-6 text-gray-900 hover:bg-indigo-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500" x-data-location="{{LOCATION}}" role="menuitem">Show in Explorer</span></button>'+
'               <button type="button" class="list-menu-uninstall block w-32 px-3 py-1 text-sm leading-6 text-gray-900 hover:bg-indigo-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500" x-data-id="{{ID}}" x-data-name="{{NAME}}" x-data-location="{{LOCATION}}" role="menuitem">Uninstall</button>'+
'           </div>'+
'        </div>'+
'    </div>'+
'</li>';

const downloadListItem = ''+
'<li class="flex justify-between gap-x-6 py-5 border-b border-gray-800">'+
'    <div class="flex min-w-0 gap-x-4">'+
'        <div class="min-w-0 flex-auto">'+
'            <p class="text-xl font-semibold leading-6 text-white">{{NAME}}</p>'+
'            <p class="mt-1 truncate-reverse text-sm leading-5 text-gray-400"></p>'+
'        </div>'+
'    </div>'+
'    <div class="flex shrink-0 items-center gap-x-6">'+
'        <div class="flex-fill items-end">'+
'            <p class="download-state text-base w-32 text-left leading-6 text-white">Downloading</p>'+
'            <div class="mt-1 h-1 w-32 bg-neutral-200 dark:bg-neutral-600">'+
'                <div class="download-progress h-1 bg-indigo-500" style="width: 0%"></div>'+
'            </div>'+
'        </div>'+
'    </div>'+
'</li>';

const releaseListItem = ''+
'<li class="flex items-center justify-between gap-x-6 mx-6 py-4">'+
'    <div class="min-w-0">'+
'        <div class="flex items-start gap-x-3">'+
'            <p class="text-lg font-semibold leading-6 text-white">{{NAME}}</p>'+
'            <p class="{{LATEST_HIDDEN}}rounded-md whitespace-nowrap mt-0.5 px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset text-green-700 bg-green-50 ring-green-600/20">Latest</p>'+
'        </div>'+
'        <div class="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-400">'+
'           <p class="whitespace-nowrap">Created {{CREATED}}</p>'+
'        </div>'+
'    </div>'+
'    <div class="flex flex-none items-center gap-x-4">'+
'        <button type="button" x-data-name="{{NAME}}" x-data-id="{{ID}}" class="release-modal-install ml-3 inline-flex items-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">Install Release</button>'+
'    </div>'+
'</li>';

function htmlToElem(html) {
    let temp = document.createElement('template');
    html = html.trim();
    temp.innerHTML = html;
    return temp.content.firstChild;
}

module.exports = {
    htmlToElem: (html) => htmlToElem(html),
    install: {
        listItem: installListItem,
        downloadItem: downloadListItem
    },
    release: {
        listItem: releaseListItem
    }
}