document.addEventListener('DOMContentLoaded', () => {
    const searchBar = document.getElementById('search-bar');
    
    loadWatchlist();
    setupSettings();
    applyTheme();

    // Listen for storage changes to refresh UI
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && (changes.watchlist || changes.settings)) {
            const currentFilter = searchBar.value;
            loadWatchlist(currentFilter);
            applyTheme();
        }
    });

    // Listen for search input
    searchBar.addEventListener('input', (e) => {
        loadWatchlist(e.target.value);
    });

    // --- Event Delegation for the entire panel ---
    document.body.addEventListener('click', (e) => {
        const actionTarget = e.target.closest('[data-action]');

        if (!actionTarget) return;

        const action = actionTarget.dataset.action;
        const id = actionTarget.dataset.id;

        // Close any open menus if clicking outside of a menu
        if (!e.target.closest('.card-actions')) {
            document.querySelectorAll('.menu-popup.show').forEach(m => m.classList.remove('show'));
            document.querySelectorAll('.video-card.is-active').forEach(c => c.classList.remove('is-active'));
        }

        switch (action) {
            case 'play':
                handlePlay(id);
                break;
            case 'toggle-menu':
                e.stopPropagation();
                const card = actionTarget.closest('.video-card');
                const menu = actionTarget.nextElementSibling;
                const isOpening = !menu.classList.contains('show');

                // Close all menus and remove active states
                document.querySelectorAll('.menu-popup.show').forEach(m => m.classList.remove('show'));
                document.querySelectorAll('.video-card.is-active').forEach(c => c.classList.remove('is-active'));
                
                // If we are opening a new menu, show it and set its card to active
                if (isOpening) {
                    menu.classList.add('show');
                    if (card) card.classList.add('is-active');
                }
                break;
            case 'toggle-pin':
                togglePin(id);
                break;
            case 'delete':
                deleteItem(id);
                break;
            case 'add-page-manually':
                handleAddPageManually();
                break;
        }
    });
});

function handleAddPageManually() {
    console.log("Sidepanel: Sending TRIGGER_MANUAL_ADD to background."); // For debugging
    chrome.runtime.sendMessage({action: "TRIGGER_MANUAL_ADD"}, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Conwatch Error:", chrome.runtime.lastError.message);
        }
    });
}

function handlePlay(id) {
    if (!id) return;
    chrome.storage.local.get({ watchlist: [] }, (result) => {
        const item = result.watchlist.find(i => i.id === id);
        if (item) {
            const targetUrl = new URL(item.url);
            // We use #conwatch-t= to tell the content script where to start
            // Only add the hash if there is a timestamp to resume from.
            if (item.timestamp > 0) {
                 if (targetUrl.hash) targetUrl.hash += `&conwatch-t=${item.timestamp}`;
                 else targetUrl.hash = `conwatch-t=${item.timestamp}`;
            }
            chrome.tabs.create({ url: targetUrl.href });
        }
    });
}



function formatTime(seconds) {
    if (!seconds) return "0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function loadWatchlist(filterText = '') {
    chrome.storage.local.get({ watchlist: [] }, (result) => {
        const listContainer = document.getElementById('video-list');
        listContainer.innerHTML = '';
        
        let list = result.watchlist;
        const normalizedFilter = filterText.toLowerCase();

        if (normalizedFilter) {
            list = list.filter(item => 
                item.title.toLowerCase().includes(normalizedFilter) ||
                item.hostname.toLowerCase().includes(normalizedFilter)
            );
        }
        
        list.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return b.lastWatched - a.lastWatched;
        });

        if (list.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'empty-list-placeholder';

            const icon = document.createElement('div');
            icon.className = 'placeholder-icon';
            icon.textContent = '🔎';
            placeholder.appendChild(icon);

            const title = document.createElement('div');
            title.className = 'placeholder-title';
            title.textContent = 'No Results Found';
            placeholder.appendChild(title);

            const text = document.createElement('div');
            text.className = 'placeholder-text';
            text.textContent = filterText ? 'Try a different search term.' : 'Watch something or press the + button to add manually.';
            placeholder.appendChild(text);
            
            listContainer.appendChild(placeholder);
            return;
        }

        list.forEach(item => {
            const progressPercent = item.duration > 0 ? (item.timestamp / item.duration) * 100 : 0;
            const card = document.createElement('div');
            card.className = 'video-card';
            card.dataset.action = 'play';
            card.dataset.id = item.id;

            // Favicon Area
            const faviconArea = document.createElement('div');
            faviconArea.className = 'favicon-area';
            const siteIcon = document.createElement('img');
            siteIcon.src = item.favicon;
            siteIcon.className = 'site-icon';
            siteIcon.onerror = () => { siteIcon.style.visibility = 'hidden'; };
            faviconArea.appendChild(siteIcon);
            if (item.pinned) {
                const pinIcon = document.createElement('div');
                pinIcon.className = 'pin-icon';
                pinIcon.textContent = '📌';
                faviconArea.appendChild(pinIcon);
            }
            card.appendChild(faviconArea);

            // Card Details
            const cardDetails = document.createElement('div');
            cardDetails.className = 'card-details';
            const titleDiv = document.createElement('div');
            titleDiv.className = 'title';
            titleDiv.title = item.title;
            titleDiv.textContent = item.title;
            cardDetails.appendChild(titleDiv);
            const hostnameDiv = document.createElement('div');
            hostnameDiv.className = 'hostname';
            hostnameDiv.textContent = item.hostname.replace('www.', '');
            cardDetails.appendChild(hostnameDiv);
            
            // Progress Container
            const progressContainer = document.createElement('div');
            progressContainer.className = 'progress-container';
            const progressFill = document.createElement('div');
            progressFill.className = 'progress-fill';
            progressFill.style.width = `${progressPercent}%`;
            progressContainer.appendChild(progressFill);
            const timestampSpan = document.createElement('span');
            timestampSpan.className = 'timestamp';
            timestampSpan.textContent = `${formatTime(item.timestamp)} / ${formatTime(item.duration)}`;
            progressContainer.appendChild(timestampSpan);
            cardDetails.appendChild(progressContainer);
            card.appendChild(cardDetails);

            // Card Actions
            const cardActions = document.createElement('div');
            cardActions.className = 'card-actions';
            const dotsBtn = document.createElement('button');
            dotsBtn.className = 'dots-btn';
            dotsBtn.dataset.action = 'toggle-menu';
            dotsBtn.dataset.id = item.id;
            dotsBtn.textContent = '•••';
            cardActions.appendChild(dotsBtn);

            // Menu Popup
            const menuPopup = document.createElement('div');
            menuPopup.className = 'menu-popup';
            const pinBtn = document.createElement('button');
            pinBtn.className = 'menu-item';
            pinBtn.dataset.action = 'toggle-pin';
            pinBtn.dataset.id = item.id;
            pinBtn.textContent = item.pinned ? 'Unpin' : 'Pin to Top';
            menuPopup.appendChild(pinBtn);
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'menu-item delete';
            deleteBtn.dataset.action = 'delete';
            deleteBtn.dataset.id = item.id;
            deleteBtn.textContent = 'Remove';
            menuPopup.appendChild(deleteBtn);
            
            cardActions.appendChild(menuPopup);
            card.appendChild(cardActions);
            
            listContainer.appendChild(card);
        });
    });
}

function togglePin(id) {
    chrome.storage.local.get({ watchlist: [] }, (res) => {
        const list = res.watchlist.map(item => {
            if (item.id === id) item.pinned = !item.pinned;
            return item;
        });
        chrome.storage.local.set({ watchlist: list });
    });
}

function deleteItem(id) {
    chrome.storage.local.get({ watchlist: [] }, (res) => {
        const list = res.watchlist.filter(item => item.id !== id);
        chrome.storage.local.set({ watchlist: list });
    });
}

function setupSettings() {
    const modal = document.getElementById('settings-modal');
    const openBtn = document.getElementById('settings-btn');
    const closeBtn = document.getElementById('close-settings');
    const autosaveInput = document.getElementById('autosave-sites');
    const themeSelector = document.querySelector('.theme-selector');
    
    let currentTheme;

    // Open Modal
    openBtn.onclick = () => {
        modal.classList.remove('hidden');
        chrome.storage.local.get({ settings: { theme: 'auto', autosave: '' } }, (res) => {
            currentTheme = res.settings.theme;
            autosaveInput.value = res.settings.autosave;
            updateThemeButtons(currentTheme);
        });
    };

    // Handle theme button clicks
    themeSelector.addEventListener('click', (e) => {
        const theme = e.target.dataset.theme;
        if (theme) {
            currentTheme = theme;
            updateThemeButtons(currentTheme);
        }
    });

    // Close & Save
    closeBtn.onclick = () => {
        chrome.storage.local.get({ settings: {} }, (res) => {
            const newSettings = {
                ...res.settings,
                theme: currentTheme,
                autosave: autosaveInput.value
            };
            chrome.storage.local.set({ settings: newSettings }, () => {
                modal.classList.add('hidden');
            });
        });
    };
    
    function updateThemeButtons(activeTheme) {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            if (btn.dataset.theme === activeTheme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
}

function applyTheme() {
    chrome.storage.local.get({ settings: { theme: 'auto' } }, (res) => {
        const theme = res.settings.theme;
        document.body.classList.remove('light-mode', 'dark-mode');
        if (theme === 'light') {
            document.body.classList.add('light-mode');
        } else if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        }
        // If 'auto', no class is added, and the @media rule in CSS takes over.
    });
}