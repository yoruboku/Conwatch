// background.js

// 1. Shared save function
function saveItem(itemData) {
    chrome.storage.local.get({ watchlist: [] }, (result) => {
        let list = result.watchlist;
        const existingIndex = list.findIndex(item => item.id === itemData.id);
        let pinned = false;
        
        if (existingIndex > -1) {
            pinned = list[existingIndex].pinned; // Preserve pin state
            list.splice(existingIndex, 1);
        }
        
        itemData.pinned = pinned;
        list.unshift(itemData);
        
        if (list.length > 50) list.pop();
        
        chrome.storage.local.set({ watchlist: list });
    });
}


// 2. Handle Keyboard Shortcuts
chrome.commands.onCommand.addListener((command) => {
    // This command now messages the background script itself to find video details
    if (command === "manual-save") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                // Ask content script for video details
                chrome.tabs.sendMessage(tabs[0].id, { action: "GET_VIDEO_DETAILS" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log("Error getting video details:", chrome.runtime.lastError.message);
                        return;
                    }
                    if (response && response.data) {
                        saveItem(response.data);
                    }
                });
            }
        });
    }
});

// 3. Handle Messages from other scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // Message from content script with auto-saved video data
    if (msg.action === "SAVE_VIDEO") {
        saveItem(msg.data);
        sendResponse({ success: true });
        return true;
    } 
    // Message from the side panel to manually bookmark a page
    else if (msg.action === "TRIGGER_MANUAL_ADD") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                const tab = tabs[0];
                const pageUrl = tab.url.split('#')[0];
                const data = {
                    id: new URL(tab.url).hostname + new URL(tab.url).pathname,
                    url: pageUrl,
                    hostname: new URL(tab.url).hostname,
                    title: tab.title || pageUrl,
                    episode: '',
                    timestamp: 0,
                    duration: 0,
                    thumbnail: '',
                    favicon: tab.favIconUrl || `${new URL(tab.url).origin}/favicon.ico`,
                    lastWatched: Date.now()
                };
                saveItem(data);
                // We could add a notification here if needed
            }
        });
        sendResponse({ success: true });
        return true;
    }
});

// 4. (Chrome Only) Enable side panel behavior
if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .catch((error) => console.error(error));
}