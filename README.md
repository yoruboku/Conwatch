# Conwatch

Conwatch is an open-source browser extension that creates a universal **“continue watching”** list for video content across the web.  

It automatically detects what you're watching, saves your progress, and lets you resume from any point through a smooth side panel UI.

Conwatch works on Chrome, Firefox, Opera, and Zen Browser.

---

## ✨ Features

### 🔹 Universal Video Tracking
- Detects videos on almost any website.
- Saves title, link, thumbnail, and exact timestamp.
- Optional autosave when leaving selected websites.

### 🔹 Continue Watching Panel
- Opens a modern, animated side panel with all your saved videos.
- Each item shows:
  - Thumbnail  
  - Title  
  - Season/Episode (if found)  
  - Website source  
  - Watch progress  
- Includes actions:
  - **Play** → Opens the page and resumes at the saved timestamp  
  - **Pin** → Keep a video at the top  
  - **Delete**  
  - **Manual Add (+)** → Saves the current page’s video

### 🔹 Customizable Settings
- Choose which sites should autosave.
- Light & dark themes.
- Change keyboard shortcuts through the browser’s extension shortcut page.
- See extension info and GitHub link.

### 🔹 Keybinds
(Default values — customizable in browser settings)
- **Alt + Shift + M** → Open side panel  
- **Alt + Shift + N** → Manual save

---

## 📦 Installation

### manual installation
#### **Chrome / Opera / Edge**
1. Download the latest release.
2. Go to `chrome://extensions`
3. Enable **Developer Mode**.
4. Click **Load Unpacked** and select the extension folder.

### **Firefox**
1. Go to `about:debugging#/runtime/this-firefox`  
2. Click **Load Temporary Add-on…**  
3. Select `manifest.firefox.json`.

---

## 🧠 How It Works
Conwatch injects a lightweight content script into supported pages.  
It identifies active `<video>` elements, extracts metadata, and saves progress using browser storage APIs.  
The background script manages communication and syncing between tabs, content scripts, and the side panel UI.

---

## 🛠️ Tech Used
- Plain JavaScript (ES6+)
- HTML + CSS (no frameworks, no build tools)
- Separate manifests for Chrome and Firefox
- Browser `storage.local` for saved data
- Message passing between scripts

---

## 🤝 Contributing

Contributions are welcome!  

---

## 📄 License
This project is open-source under the MIT License.

---

## ⭐ Support the Project
If you enjoy Conwatch, star the repository on GitHub to support development!

