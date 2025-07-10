// This service worker is the central coordinator for the extension.

chrome.runtime.onInstalled.addListener(() => {
  // Set default state on installation. The claims sidebar is ON by default.
  chrome.storage.local.set({ isStatimEnabled: true });
  console.log('Statim extension installed. Claims sidebar is ON by default.');
});

// Listen for when a tab is completely loaded and its URL changes.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Ensure the tab is fully loaded and is a Google Patents page.
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('patents.google.com/patent')) {
        // When the tab is ready, send a message to the content script to initialize.
        // This is more reliable than having the content script message first.
        chrome.tabs.sendMessage(tabId, { action: "initialize" }, (response) => {
            if (chrome.runtime.lastError) {
                // This error is expected if the content script hasn't been injected yet.
                // We can safely ignore it or log it for debugging.
                // console.log('Statim: Content script not ready yet.');
            } else {
                // console.log('Statim: Initialization message sent and received.', response);
            }
        });
    }
});

// Listen for any messages from other parts of the extension.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getPatents") {
        chrome.storage.local.get(['patentList', 'currentIndex'], (result) => {
            sendResponse(result);
        });
        // Return true to indicate that the response is asynchronous.
        return true;
    }
});
