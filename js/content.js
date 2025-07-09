// Statim v4.0 - Final Production Code

console.log('Statim: Production Version Loaded.');

const STATIM_WINDOW_ID = 'statim-movable-window';
const STATIM_AI_HIGHLIGHT_CLASS = 'statim-highlight';
const STATIM_SIMPLE_HIGHLIGHT_CLASS = 'statim-simple-highlight';
const STATIM_IRRELEVANT_CLASS = 'statim-irrelevant';
const SERVER_URL = 'https://your-server-url.com/api/gemini'; // Replace with your deployed server URL

/**
 * Creates the movable and resizable window pane.
 */
function createMovableWindow() {
    if (document.getElementById(STATIM_WINDOW_ID)) return;

    const windowPane = document.createElement('div');
    windowPane.id = STATIM_WINDOW_ID;
    windowPane.style.display = 'none';

    windowPane.innerHTML = `
        <div class="statim-window-header">
            <span>Selected Claim</span>
            <div class="statim-header-buttons">
                <button id="statim-summary-btn" class="statim-header-btn" title="Generate a summary of the patent">Summarize (AI)</button>
                <button id="statim-ai-btn" class="statim-header-btn" title="Select text below to enable" disabled>Check Scope (AI)</button>
            </div>
            <button class="statim-close-btn" title="Close">×</button>
        </div>
        <div class="statim-window-content">
            <div id="statim-summary-display" style="display: none;"></div>
            <div id="statim-claim-display"></div>
        </div>
        <div class="statim-resize-handle"></div>
    `;
    document.body.appendChild(windowPane);

    const header = windowPane.querySelector('.statim-window-header');
    const resizeHandle = windowPane.querySelector('.statim-resize-handle');
    const content = windowPane.querySelector('.statim-window-content');
    const scopeBtn = document.getElementById('statim-ai-btn');
    const summaryBtn = document.getElementById('statim-summary-btn');
    
    let isDragging = false, isResizing = false;
    let dragOffsetX, dragOffsetY;
    
    header.onmousedown = (e) => { 
        if (e.target.tagName.toLowerCase() !== 'button') {
            isDragging = true; 
            dragOffsetX = e.clientX - windowPane.offsetLeft; 
            dragOffsetY = e.clientY - windowPane.offsetTop; 
            e.preventDefault(); 
        }
    };
    resizeHandle.onmousedown = (e) => { isResizing = true; e.preventDefault(); };
    document.onmousemove = (e) => {
        if (isDragging) { windowPane.style.left = `${e.clientX - dragOffsetX}px`; windowPane.style.top = `${e.clientY - dragOffsetY}px`; }
        if (isResizing) {
            const newWidth = e.clientX - windowPane.offsetLeft;
            const newHeight = e.clientY - windowPane.offsetTop;
            windowPane.style.width = `${newWidth}px`;
            windowPane.style.height = `${newHeight}px`;
            content.style.fontSize = `${Math.max(10, newWidth / 30)}px`;
        }
    };
    document.onmouseup = () => { isDragging = false; isResizing = false; };
    windowPane.querySelector('.statim-close-btn').onclick = () => { windowPane.style.display = 'none'; clearHighlights(); };

    content.addEventListener('mouseup', () => handleTextSelection(scopeBtn));

    scopeBtn.onclick = () => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        const fullClaimText = content.querySelector('#statim-claim-display').innerText;
        
        if (selectedText) {
            scopeBtn.textContent = 'Checking...';
            scopeBtn.disabled = true;
            findInDescriptionWithAI(selectedText, fullClaimText, scopeBtn);
        }
    };

    summaryBtn.onclick = () => {
        summaryBtn.textContent = 'Summarizing...';
        summaryBtn.disabled = true;
        generatePatentSummary(document.getElementById('statim-summary-display'), summaryBtn);
    };
}

function showClaimInWindow(claimElement) {
    const windowPane = document.getElementById(STATIM_WINDOW_ID);
    if (!windowPane) return;

    const claimDisplay = windowPane.querySelector('#statim-claim-display');
    const summaryDisplay = windowPane.querySelector('#statim-summary-display');
    const summaryBtn = windowPane.querySelector('#statim-summary-btn');
    
    const claimClone = claimElement.cloneNode(true);
    const buttonInClone = claimClone.querySelector('.statim-pin-btn');
    if(buttonInClone) buttonInClone.remove();

    claimDisplay.innerHTML = '';
    claimDisplay.appendChild(claimClone);
    
    summaryDisplay.innerHTML = '';
    summaryDisplay.style.display = 'none';
    summaryBtn.textContent = 'Summarize (AI)';
    summaryBtn.disabled = false;

    windowPane.style.display = 'flex';
}

function initializeClaimButtons() {
    const claims = document.querySelectorAll('div.claim[num]:not([data-statim-processed])');
    claims.forEach((claim) => {
        claim.dataset.statimProcessed = 'true';
        claim.style.position = 'relative';
        claim.style.paddingTop = '40px';

        const btn = document.createElement('button');
        btn.textContent = 'Pin Claim';
        btn.className = 'statim-pin-btn';
        btn.title = 'Pin this claim in a movable window';
        btn.onclick = (e) => { e.stopPropagation(); e.preventDefault(); showClaimInWindow(claim); };
        claim.appendChild(btn);
    });
}

function handleTextSelection(scopeBtn) {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText.length > 2) {
        scopeBtn.disabled = false;
        performSimpleSearch(selectedText);
    } else {
        scopeBtn.disabled = true;
        clearHighlights();
    }
}

function clearHighlights() {
    const descriptionElement = document.querySelector('section#description');
    if (!descriptionElement) return;
    descriptionElement.querySelectorAll(`.${STATIM_IRRELEVANT_CLASS}`).forEach(el => el.classList.remove(STATIM_IRRELEVANT_CLASS));
    descriptionElement.querySelectorAll(`.${STATIM_AI_HIGHLIGHT_CLASS}, .${STATIM_SIMPLE_HIGHLIGHT_CLASS}`).forEach(el => {
        const parent = el.parentNode;
        if (parent) {
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            parent.removeChild(el);
            parent.normalize();
        }
    });
}

function performSimpleSearch(selectedText) {
    clearHighlights();
    const descriptionElement = document.querySelector('section#description');
    if (!descriptionElement) return;

    const stopWords = new Set(['a', 'an', 'the', 'in', 'of', 'to', 'and', 'is', 'for', 'it', 'with', 'as', 'on', 'or', 'at', 'by']);
    const keywords = selectedText.toLowerCase().split(/\s+/).filter(word => word.length > 2 && !stopWords.has(word));

    if (keywords.length === 0) {
        const pattern = selectedText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(pattern, 'gi');
        highlightUsingRegex(descriptionElement, regex, STATIM_SIMPLE_HIGHLIGHT_CLASS);
        return;
    }

    const highlightPattern = keywords.join('|');
    const highlightRegex = new RegExp(highlightPattern, 'gi');

    manageParagraphVisibility(descriptionElement, keywords, false);
    highlightUsingRegex(descriptionElement, highlightRegex, STATIM_SIMPLE_HIGHLIGHT_CLASS);
}

async function callBackend(prompt) {
    const payload = { 
        prompt,
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
    };
    const response = await fetch(SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Server Error: ${response.status} ${response.statusText}`);
    return await response.json();
}

async function findInDescriptionWithAI(selectedText, fullClaimText, scopeBtn) {
    clearHighlights();
    const descriptionElement = document.querySelector('section#description');
    if (!descriptionElement) {
        scopeBtn.textContent = 'Error: No description';
        return;
    }
    
    const keywords = selectedText.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const relevantParagraphs = getRelevantParagraphs(descriptionElement, keywords);
    const focusedDescriptionText = relevantParagraphs.map(p => p.innerText).join('\n\n');

    if (focusedDescriptionText.length < 10) {
        scopeBtn.textContent = 'No relevant text found';
        setTimeout(() => { scopeBtn.textContent = 'Check Scope (AI)'; scopeBtn.disabled = true; }, 2000);
        return;
    }

    const prompt = `You are a patent analysis assistant acting as an expert in claim construction. The user has selected a key phrase from a patent claim. Your task is to find all sentences in the provided patent description text that define, explain, or provide essential context for this phrase. Think about the meaning and the concepts, not just the literal words.
FULL CLAIM CONTEXT: "${fullClaimText}"
USER'S SELECTED PHRASE: "${selectedText}"
TASK: From the provided patent description text, extract every complete sentence that is conceptually relevant to the user's selected phrase. Return ONLY these exact sentences, each on a new line.

DESCRIPTION TEXT:
---
${focusedDescriptionText}
---`;

    try {
        const result = await callBackend(prompt);
        if (result.candidates && result.candidates[0].content.parts[0].text) {
            const foundSentences = result.candidates[0].content.parts[0].text.split('\n').filter(s => s.trim() !== '');
            manageParagraphVisibility(descriptionElement, foundSentences, true);
            const pattern = foundSentences.map(s => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
            const regex = new RegExp(pattern, 'g');
            highlightUsingRegex(descriptionElement, regex, STATIM_AI_HIGHLIGHT_CLASS);
        }
        scopeBtn.textContent = 'Check Scope (AI)';
        scopeBtn.disabled = true;
    } catch (error) {
        console.error("Statim: Error calling server:", error);
        scopeBtn.textContent = 'Server Error';
        scopeBtn.title = error.message;
        scopeBtn.style.backgroundColor = '#dc3545';
        scopeBtn.disabled = false;
    }
}

async function generatePatentSummary(summaryDisplay, summaryBtn) {
    const abstract = document.querySelector('section#abstract .abstract-text')?.innerText || '';
    const claims = document.querySelector('section#claims')?.innerText || '';
    const description = document.querySelector('section#description')?.innerText || '';
    const fullPatentText = `ABSTRACT:\n${abstract}\n\nCLAIMS:\n${claims}\n\nDESCRIPTION:\n${description}`;
    const prompt = `You are a patent summarization expert. Based on the full text of the patent provided below, generate a concise, one-paragraph summary of the core invention. Focus on the problem being solved and the proposed solution.\n\nPATENT TEXT:\n---\n${fullPatentText}\n---`;

    try {
        const result = await callBackend(prompt);
        if (result.candidates && result.candidates[0].content.parts[0].text) {
            summaryDisplay.innerHTML = `<h4>AI Summary</h4><p><em>${result.candidates[0].content.parts[0].text}</em></p>`;
            summaryDisplay.style.display = 'block';
        }
        summaryBtn.textContent = 'Summarize (AI)';
        summaryBtn.disabled = false;
    } catch (error) {
        console.error("Statim: Error calling server for summary:", error);
        summaryBtn.textContent = 'Server Error';
        summaryBtn.title = error.message;
        summaryBtn.style.backgroundColor = '#dc3545';
        summaryBtn.disabled = false;
    }
}

function manageParagraphVisibility(container, searchTerms, isSentenceSearch = false) {
    const paragraphs = container.querySelectorAll('.description-paragraph');
    paragraphs.forEach(p => {
        const paragraphText = p.innerText.toLowerCase();
        const isRelevant = searchTerms.some(term => paragraphText.includes(isSentenceSearch ? term.toLowerCase() : term));
        if (!isRelevant) p.classList.add(STATIM_IRRELEVANT_CLASS);
        else p.classList.remove(STATIM_IRRELEVANT_CLASS);
    });
}

function getRelevantParagraphs(container, keywords) {
    const paragraphs = container.querySelectorAll('.description-paragraph');
    const relevantParagraphs = [];
    paragraphs.forEach(p => {
        const paragraphTextLower = p.innerText.toLowerCase();
        const isRelevant = keywords.some(keyword => paragraphTextLower.includes(keyword));
        if (isRelevant) relevantParagraphs.push(p);
    });
    return relevantParagraphs;
}

function highlightUsingRegex(container, regex, highlightClass) {
    const treeWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (treeWalker.nextNode()) {
        if (treeWalker.currentNode.parentElement.offsetParent !== null) textNodes.push(treeWalker.currentNode);
    }
    let firstMatchElement = null;
    textNodes.forEach(node => {
        if (regex.test(node.textContent)) {
            const parent = node.parentNode;
            if(!parent) return;
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;
            regex.lastIndex = 0; 
            while ((match = regex.exec(node.textContent)) !== null) {
                if (match.index > lastIndex) fragment.appendChild(document.createTextNode(node.textContent.substring(lastIndex, match.index)));
                const mark = document.createElement('mark');
                mark.className = highlightClass;
                mark.textContent = match[0];
                fragment.appendChild(mark);
                if (!firstMatchElement) firstMatchElement = mark;
                lastIndex = regex.lastIndex;
            }
            if (lastIndex < node.textContent.length) fragment.appendChild(document.createTextNode(node.textContent.substring(lastIndex)));
            parent.replaceChild(fragment, node);
        }
    });
    if (firstMatchElement) firstMatchElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function injectPatentNavigator() {
    chrome.storage.local.get(['patentList'], (result) => {
        const patentList = result.patentList;
        if (!patentList || patentList.length <= 1) return;
        const match = window.location.pathname.match(/\/patent\/([^/]+)/);
        if (!match) return;
        const currentPatentId = match[1];
        const currentIndex = patentList.findIndex(p => p.replace(/,/g, '').replace(/\s/g, '').toLowerCase() === currentPatentId.toLowerCase());
        if (currentIndex === -1) return;
        const prevPatent = patentList[currentIndex - 1];
        const nextPatent = patentList[currentIndex + 1];
        const anchorElement = document.querySelector('section.knowledge-card header');
        if (!anchorElement || document.getElementById('statim-navigator')) return;
        const navigatorDiv = document.createElement('div');
        navigatorDiv.id = 'statim-navigator';
        let html = `<div class="statim-navigator-info">Patent List (${currentIndex + 1} of ${patentList.length})</div><div class="statim-navigator-buttons">`;
        if (prevPatent) html += `<a href="https://patents.google.com/patent/${prevPatent.replace(/,/g, '').replace(/\s/g, '')}/en" class="statim-navigator-btn">‹ Prev</a>`;
        else html += `<span class="statim-navigator-btn disabled">‹ Prev</span>`;
        if (nextPatent) html += `<a href="https://patents.google.com/patent/${nextPatent.replace(/,/g, '').replace(/\s/g, '')}/en" class="statim-navigator-btn">Next ›</a>`;
        else html += `</div>`;
        html += `</div>`;
        navigatorDiv.innerHTML = html;
        anchorElement.parentNode.insertBefore(navigatorDiv, anchorElement.nextSibling);
    });
}

function main() {
    createMovableWindow();
    injectPatentNavigator();
    const observer = new MutationObserver(() => initializeClaimButtons());
    observer.observe(document.body, { childList: true, subtree: true });
    initializeClaimButtons();
}

const startupObserver = new MutationObserver((mutations, obs) => {
    if (document.querySelector('.style-scope.patent-result')) {
        main();
        obs.disconnect();
    }
});
startupObserver.observe(document.body, { childList: true, subtree: true });
