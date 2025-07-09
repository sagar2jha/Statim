document.addEventListener('DOMContentLoaded', () => {
    const masterToggle = document.getElementById('master-toggle');
    const patentListTextArea = document.getElementById('patent-list');
    const loadPatentsBtn = document.getElementById('load-patents-btn');
    const statusMessage = document.getElementById('status-message');

    // --- Master Toggle Logic ---
    chrome.storage.local.get(['isStatimEnabled'], (result) => {
        // Set the toggle to be on by default if no value is stored
        masterToggle.checked = result.isStatimEnabled !== false;
    });

    masterToggle.addEventListener('change', () => {
        const isEnabled = masterToggle.checked;
        chrome.storage.local.set({ isStatimEnabled: isEnabled }, () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'toggleStatim',
                        isEnabled: isEnabled
                    });
                }
            });
        });
    });

    // --- Patent List Logic ---
    chrome.storage.local.get(['patentList'], (result) => {
        if (result.patentList) {
            patentListTextArea.value = result.patentList.join('\n');
        }
    });

    loadPatentsBtn.addEventListener('click', () => {
        const patents = patentListTextArea.value.split('\n').map(p => p.trim()).filter(p => p);

        if (patents.length > 0) {
            // Save the full list to storage for the content script to use
            chrome.storage.local.set({ patentList: patents }, () => {
                const firstPatent = patents[0];
                let patentUrl = '';

                // Smart URL generation logic
                if (/^[a-zA-Z]/.test(firstPatent)) {
                    const cleanedPatentNumber = firstPatent.replace(/,/g, '').replace(/\s/g, '');
                    patentUrl = `https://patents.google.com/patent/${cleanedPatentNumber}/en`;
                } else {
                    patentUrl = `https://patents.google.com/?q=${encodeURIComponent(firstPatent)}`;
                }

                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0] && tabs[0].url && tabs[0].url.includes('patents.google.com')) {
                        chrome.tabs.update(tabs[0].id, { url: patentUrl });
                    } else {
                        chrome.tabs.create({ url: patentUrl });
                    }
                });

                statusMessage.textContent = 'Patent list loaded!';
                statusMessage.style.color = '#28a745';
                setTimeout(() => window.close(), 1500);
            });
        } else {
            statusMessage.textContent = 'Please enter at least one patent number.';
            statusMessage.style.color = '#dc3545';
        }
    });
});
