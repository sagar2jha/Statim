// Service worker for Manifest V3

chrome.runtime.onInstalled.addListener(() => {
  // Set default state on installation. The claims sidebar is ON by default.
  chrome.storage.local.set({ isStatimEnabled: true });
});

// Listen for messages from the popup (the master toggle)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleStatim') {
        // This message is received when the user flips the on/off switch.
        // We need to notify the active tab to enable or disable its features.
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                // We don't actually need to do anything here, because the content
                // script will handle showing/hiding its own features based on
                // the 'isStatimEnabled' value in storage. This listener is here
                // for potential future use.
            }
        });
    }
});
