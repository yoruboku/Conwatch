// content.js

function getMainVideo() {
    const videos = Array.from(document.querySelectorAll('video')).map(video => {
        const rect = video.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        let score = 0;

        if (rect.width < 200 || rect.height < 150 || video.duration < 10 || !video.src || video.readyState === 0) {
            return { video, score: -1 };
        }

        score += rect.width * rect.height;
        if (!video.paused) score *= 1.5;
        
        const isVisible = rect.top < viewportHeight && rect.bottom > 0 && rect.left < viewportWidth && rect.right > 0;
        if (isVisible) score *= 1.2; else score *= 0.5;

        if ((video.webkitAudioDecentBytesPerSample > 0) || video.mozHasAudio || video.volume > 0 && !video.muted) {
            score *= 1.2;
        }

        return { video, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

    return videos.length > 0 ? videos[0].video : null;
}

// 2. Extract Metadata
function getMetadata(video) { // video can be null
    const rawTitle = document.title || window.location.href;
    const title = rawTitle.split(' - ')[0] || rawTitle;

    let episode = "";
    // Only scan for episode if there's a video
    if (video) {
        const bodyText = document.body.innerText.substring(0, 5000); 
        const epMatch = bodyText.match(/S(\d+)E(\d+)|Season\s(\d+)|Episode\s(\d+)/i);
        if (epMatch) episode = epMatch[0];
    }
    
    const favicon = document.querySelector("link[rel~='icon']")?.href || `${window.location.origin}/favicon.ico`;
    const thumbnail = video ? video.poster || "" : ""; 
    
    return { title, episode, thumbnail, favicon };
}

// 3. Save Function
function saveVideoState(manual = false) {
    const video = getMainVideo();
    if (!video) {
        if (manual) showToast("No video found to save. Use the + button to bookmark the page.");
        return;
    }

    if (!manual && video.paused) return;

    chrome.storage.local.get({ settings: { autosave: '' } }, (res) => {
        const currentHost = window.location.hostname.toLowerCase();
        const allowedSites = (res.settings.autosave || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

        // LOGIC INVERTED: Only save if the allowed list is NOT empty and the site is on it.
        const shouldAutoSave = allowedSites.length > 0 && allowedSites.some(site => currentHost.includes(site));

        if (!manual && !shouldAutoSave) return;

        const meta = getMetadata(video);
        const data = {
            id: window.location.host + window.location.pathname + window.location.search, 
            url: window.location.href.split('#')[0],
            hostname: window.location.hostname,
            title: meta.title,
            episode: meta.episode,
            timestamp: video.currentTime,
            duration: video.duration || 0,
            thumbnail: meta.thumbnail,
            favicon: meta.favicon,
            lastWatched: Date.now()
        };

        chrome.runtime.sendMessage({ action: "SAVE_VIDEO", data: data }, (response) => {
            if (manual && response?.success) showToast("Saved to Conwatch");
        });
    });
}

// 4. Listen for Commands from background script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "GET_VIDEO_DETAILS") {
        const video = getMainVideo();
        if (video) {
            const meta = getMetadata(video);
            const data = {
                id: window.location.host + window.location.pathname + window.location.search, 
                url: window.location.href.split('#')[0],
                hostname: window.location.hostname,
                title: meta.title,
                episode: meta.episode,
                timestamp: video.currentTime,
                duration: video.duration || 0,
                thumbnail: meta.thumbnail,
                favicon: meta.favicon,
                lastWatched: Date.now()
            };
            sendResponse({ data: data });
        } else {
            sendResponse({ data: null });
        }
    }
    return true; // Keep channel open for async response
});

// 5. Auto-Save Loop
setInterval(() => saveVideoState(false), 120000); // 2 minutes

// 6. Resume Logic
function checkAndResume() {
    const hash = window.location.hash;
    if (!hash.includes("conwatch-t=")) return;
    
    const timeString = hash.split("conwatch-t=")[1].split("&")[0];
    const timeToSeek = parseFloat(timeString);

    if (isNaN(timeToSeek)) return;

    console.log("Conwatch: Attempting to resume at", timeToSeek);
    
    const waitForVideo = setInterval(() => {
        const video = getMainVideo();
        if (video && video.readyState >= 1) {
            clearInterval(waitForVideo);
            video.currentTime = timeToSeek;
            video.play().catch(e => console.log("Autoplay blocked by browser", e));
            history.replaceState(null, null, window.location.pathname + window.location.search);
        }
    }, 500);
    
    setTimeout(() => clearInterval(waitForVideo), 20000); // Timeout
}


if (document.readyState === "complete") checkAndResume();
else window.addEventListener("load", checkAndResume);

// Listen for URL changes (SPA support)
let lastUrl = location.href; 
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(checkAndResume, 1000);
  }
}).observe(document, {subtree: true, childList: true});

// Helper
function showToast(text) {
    const toast = document.createElement("div");
    toast.innerText = text;
    Object.assign(toast.style, {
        position: "fixed", top: "20px", right: "20px",
        background: "#7F00FF", color: "white", padding: "12px 24px",
        borderRadius: "12px", zIndex: 9999999,
        fontFamily: "system-ui", boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
        opacity: "0", transition: "opacity 0.3s", fontWeight: "600"
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.style.opacity = "1", 100);
    setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300); }, 2500);
}