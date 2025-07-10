// This is the final, production-ready version with the definitive paragraph filtering engine.

console.log('Statim: Production Version Loaded (v40 - Final Navigator Placement).');

const STATIM_WINDOW_ID = 'statim-movable-window';
const STATIM_AI_HIGHLIGHT_CLASS = 'statim-highlight';
const STATIM_SIMPLE_HIGHLIGHT_CLASS = 'statim-simple-highlight';
const STATIM_IRRELEVANT_CLASS = 'statim-irrelevant';

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
    const summaryDisplay = document.getElementById('statim-summary-display');

    // Drag, Resize, and Close Logic
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

    // Text selection listener
    content.addEventListener('mouseup', () => handleTextSelection(scopeBtn));

    // Scope Button click listener
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

    // Summary Button click listener
    summaryBtn.onclick = () => {
        summaryBtn.textContent = 'Summarizing...';
        summaryBtn.disabled = true;
        generatePatentSummary(summaryDisplay, summaryBtn);
    };
}

/**
 * Updates the content of the movable window.
 */
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
    
    // Reset summary view when a new claim is pinned
    summaryDisplay.innerHTML = '';
    summaryDisplay.style.display = 'none';
    summaryBtn.textContent = 'Summarize (AI)';
    summaryBtn.disabled = false;

    windowPane.style.display = 'flex';
}

/**
 * Adds a "Pin Claim" button to each claim.
 */
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

/**
 * --- Search & AI Scope Check Feature ---
 */

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

    // Un-hide any hidden paragraphs
    descriptionElement.querySelectorAll(`.${STATIM_IRRELEVANT_CLASS}`).forEach(el => {
        el.classList.remove(STATIM_IRRELEVANT_CLASS);
    });

    // Remove highlight marks
    descriptionElement.querySelectorAll(`.${STATIM_AI_HIGHLIGHT_CLASS}, .${STATIM_SIMPLE_HIGHLIGHT_CLASS}`).forEach(el => {
        const parent = el.parentNode;
        if (parent) {
            while (el.firstChild) {
                parent.insertBefore(el.firstChild, el);
            }
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

/**
 * FIXED: Properly structured API call for Gemini via proxy
 */
async function findInDescriptionWithAI(selectedText, fullClaimText, scopeBtn) {
    clearHighlights();
    const descriptionElement = document.querySelector('section#description');
    if (!descriptionElement) {
        resetButton(scopeBtn, 'Error: No description');
        return;
    }
    
    const keywords = selectedText.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const relevantParagraphs = getRelevantParagraphs(descriptionElement, keywords);
    const focusedDescriptionText = relevantParagraphs.map(p => p.innerText).join('\n\n');

    if (focusedDescriptionText.length < 10) {
        resetButton(scopeBtn, 'No relevant text found');
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
        // FIXED: Proper payload structure for Gemini API
        const payload = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.2,
                topK: 1,
                topP: 1,
                maxOutputTokens: 8192,
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
        };

        const proxyServerUrl = 'https://statim-gemini-proxy-721411612148.asia-south2.run.app/gemini';

        const response = await fetch(proxyServerUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Proxy Server Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        
        // FIXED: Better error handling and response parsing
        if (result.error) {
            throw new Error(result.error.message || 'Unknown API error');
        }

        if (result.candidates && result.candidates.length > 0 && 
            result.candidates[0].content && result.candidates[0].content.parts && 
            result.candidates[0].content.parts.length > 0) {
            
            const responseText = result.candidates[0].content.parts[0].text;
            const foundSentences = responseText.split('\n').filter(s => s.trim() !== '');
            
            if (foundSentences.length > 0) {
                manageParagraphVisibility(descriptionElement, foundSentences, true);
                
                const pattern = foundSentences.map(s => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
                const regex = new RegExp(pattern, 'g');
                highlightUsingRegex(descriptionElement, regex, STATIM_AI_HIGHLIGHT_CLASS);
            }
        } else {
            throw new Error('No valid response from API');
        }
        
        resetButton(scopeBtn, 'Check Scope (AI)', true);

    } catch (error) {
        console.error("Statim: Error calling Gemini API via proxy:", error);
        scopeBtn.textContent = 'API Error';
        scopeBtn.title = error.message;
        scopeBtn.style.backgroundColor = '#dc3545';
        scopeBtn.disabled = false;
        
        // Reset after 3 seconds
        setTimeout(() => {
            resetButton(scopeBtn, 'Check Scope (AI)', true);
        }, 3000);
    }
}

/**
 * FIXED: Properly structured API call for patent summary
 */
async function generatePatentSummary(summaryDisplay, summaryBtn) {
    const abstract = document.querySelector('section#abstract .abstract-text')?.innerText || '';
    const claims = document.querySelector('section#claims')?.innerText || '';
    const description = document.querySelector('section#description')?.innerText || '';

    const fullPatentText = `ABSTRACT:\n${abstract}\n\nCLAIMS:\n${claims}\n\nDESCRIPTION:\n${description}`;

    const prompt = `You are a patent summarization expert. Based on the full text of the patent provided below (including abstract, claims, and description), generate a concise, one-paragraph summary of the core invention. Focus on the problem being solved and the proposed solution.

PATENT TEXT:
---
${fullPatentText}
---`;

    try {
        // FIXED: Proper payload structure for Gemini API
        const payload = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.2,
                topK: 1,
                topP: 1,
                maxOutputTokens: 8192,
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
        };
        
        const proxyServerUrl = 'https://statim-gemini-proxy-721411612148.asia-south2.run.app/gemini';

        const response = await fetch(proxyServerUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Proxy Server Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();

        // FIXED: Better error handling and response parsing
        if (result.error) {
            throw new Error(result.error.message || 'Unknown API error');
        }

        if (result.candidates && result.candidates.length > 0 && 
            result.candidates[0].content && result.candidates[0].content.parts && 
            result.candidates[0].content.parts.length > 0) {
            
            const responseText = result.candidates[0].content.parts[0].text;
            summaryDisplay.innerHTML = `<h4>AI Summary</h4><p><em>${responseText}</em></p>`;
            summaryDisplay.style.display = 'block';
        } else {
            throw new Error('No valid response from API');
        }
        
        summaryBtn.textContent = 'Summarize (AI)';
        summaryBtn.disabled = false;
        summaryBtn.style.backgroundColor = '';
        summaryBtn.title = '';

    } catch (error) {
        console.error("Statim: Error calling Gemini API for summary via proxy:", error);
        summaryBtn.textContent = 'API Error';
        summaryBtn.title = error.message;
        summaryBtn.style.backgroundColor = '#dc3545';
        summaryBtn.disabled = false;
        
        // Reset after 3 seconds
        setTimeout(() => {
            summaryBtn.textContent = 'Summarize (AI)';
            summaryBtn.disabled = false;
            summaryBtn.style.backgroundColor = '';
            summaryBtn.title = '';
        }, 3000);
    }
}

/**
 * ADDED: Helper function to reset buttons consistently
 */
function resetButton(button, text, shouldDisable = false) {
    button.textContent = text;
    button.disabled = shouldDisable;
    button.style.backgroundColor = '';
    button.title = '';
}

function manageParagraphVisibility(container, searchTerms, isSentenceSearch = false) {
    const paragraphs = container.querySelectorAll('.description-paragraph');
    
    paragraphs.forEach(p => {
        const paragraphText = p.innerText.toLowerCase();
        const isRelevant = searchTerms.some(term => paragraphText.includes(isSentenceSearch ? term.toLowerCase() : term));
        
        if (!isRelevant) {
            p.classList.add(STATIM_IRRELEVANT_CLASS);
        } else {
            p.classList.remove(STATIM_IRRELEVANT_CLASS);
        }
    });
}

function getRelevantParagraphs(container, keywords) {
    const paragraphs = container.querySelectorAll('.description-paragraph');
    const relevantParagraphs = [];
    paragraphs.forEach(p => {
        const paragraphTextLower = p.innerText.toLowerCase();
        const isRelevant = keywords.some(keyword => paragraphTextLower.includes(keyword));
        if (isRelevant) {
            relevantParagraphs.push(p);
        }
    });
    return relevantParagraphs;
}

function highlightUsingRegex(container, regex, highlightClass) {
    const treeWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (treeWalker.nextNode()) {
        if(treeWalker.currentNode.parentElement.offsetParent !== null) {
            textNodes.push(treeWalker.currentNode);
        }
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
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(node.textContent.substring(lastIndex, match.index)));
                }
                const mark = document.createElement('mark');
                mark.className = highlightClass;
                mark.textContent = match[0];
                fragment.appendChild(mark);
                if (!firstMatchElement) firstMatchElement = mark;
                lastIndex = regex.lastIndex;
            }

            if (lastIndex < node.textContent.length) {
                fragment.appendChild(document.createTextNode(node.textContent.substring(lastIndex)));
            }
            parent.replaceChild(fragment, node);
        }
    });

    if (firstMatchElement) {
        firstMatchElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/**
 * FIX: New, definitive function to inject the patent list navigator.
 */
function injectPatentNavigator() {
    chrome.storage.local.get(['patentList'], (result) => {
        const patentList = result.patentList;
        if (!patentList || patentList.length <= 1) return;

        const match = window.location.pathname.match(/\/patent\/([^/]+)/);
        if (!match) return;
        const currentPatentId = match[1];

        const currentIndex = patentList.findIndex(p => {
            const cleanedP = p.replace(/,/g, '').replace(/\s/g, '');
            return currentPatentId.toLowerCase() === cleanedP.toLowerCase();
        });

        if (currentIndex === -1) return;

        const prevPatent = patentList[currentIndex - 1];
        const nextPatent = patentList[currentIndex + 1];

        // This is the most stable anchor point for the blue bibliographic pane.
        const anchorElement = document.querySelector('section.knowledge-card header');
        if (!anchorElement || document.getElementById('statim-navigator')) return;

        // Create a wrapper for our new elements
        const wrapper = document.createElement('div');
        wrapper.id = 'statim-navigator-wrapper';

        // Create the navigator div
        const navigatorDiv = document.createElement('div');
        navigatorDiv.id = 'statim-navigator';

        let buttonsHtml = `<div class="statim-navigator-buttons">`;
        if (prevPatent) {
            const cleanedPrev = prevPatent.replace(/,/g, '').replace(/\s/g, '');
            buttonsHtml += `<a href="https://patents.google.com/patent/${cleanedPrev}/en" class="statim-navigator-btn">‹ Prev</a>`;
        } else {
            buttonsHtml += `<span class="statim-navigator-btn disabled">‹ Prev</span>`;
        }
        if (nextPatent) {
            const cleanedNext = nextPatent.replace(/,/g, '').replace(/\s/g, '');
            buttonsHtml += `<a href="https://patents.google.com/patent/${cleanedNext}/en" class="statim-navigator-btn">Next ›</a>`;
        } else {
            buttonsHtml += `<span class="statim-navigator-btn disabled">Next ›</span>`;
        }
        buttonsHtml += `</div>`;
        navigatorDiv.innerHTML = buttonsHtml;

        // Create the info div
        const infoDiv = document.createElement('div');
        infoDiv.className = 'statim-navigator-info';
        infoDiv.textContent = `Patent ${currentIndex + 1} of ${patentList.length}`;

        // Add our new elements to the wrapper
        wrapper.appendChild(navigatorDiv);
        wrapper.appendChild(infoDiv);

        // Prepend the wrapper to the header to place it on the left
        anchorElement.prepend(wrapper);
    });
}

/**
 * Main initialization logic.
 */
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

startupObserver.observe(document.body, {
    childList: true,
    subtree: true
});
