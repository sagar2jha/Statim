# Statim - Enhanced Patent Analysis Tools

Statim is a browser extension designed to enhance the patent research and analysis workflow on Google Patents. It provides a suite of tools to help you quickly understand the scope of claims, navigate between patents, and get high-level summaries of complex documents.

## Features

* **Movable Pinned Claims:** Pin any patent claim to a movable, resizable window that floats over the page, keeping key information in view while you scroll.
* **Simple Search with Contextual Filtering:** Select any text within the pinned claim to instantly perform a search. The description pane will automatically be filtered to show only the paragraphs containing your selected keywords.
* **AI-Powered Scope Analysis:** For a deeper analysis, use the "Check Scope (AI)" button. The AI will read the relevant portions of the description and highlight the sentences that are conceptually related to your selected phrase.
* **AI-Generated Summaries:** Get up to speed on any patent instantly. The "Summarize (AI)" button provides a concise, one-paragraph summary of the patent's core invention.
* **Patent List Navigator:** Load a list of patent numbers through the extension's popup. A navigator bar will then appear on the patent page, allowing you to seamlessly move between documents with "Next" and "Prev" buttons.
* **Secure Backend:** All AI features are processed through a secure backend server, ensuring that your API key is never exposed on the client-side.

## Getting Started

### Installation

1.  Clone this repository or download it as a ZIP file.
2.  Open Google Chrome and navigate to `chrome://extensions`.
3.  Enable **"Developer mode"** using the toggle switch in the top-right corner.
4.  Click the **"Load unpacked"** button and select the folder containing the extension's files.

## How to Use

* **Pinning a Claim:** Hover over any patent claim on the Google Patents page. A "Pin Claim" button will appear. Click it to open that claim in the movable window.
* **Simple Search:** In the movable window, select any phrase. The description on the main page will automatically be filtered and highlighted.
* **AI Scope Check:** After selecting a phrase, the "Check Scope (AI)" button in the window's header will become active. Click it to get a more advanced, contextual analysis.
* **AI Summary:** Click the "Summarize (AI)" button in the window's header to get a summary of the entire patent.
* **Patent Lists:** Click the Statim icon in your browser's toolbar to open the popup. Enter a list of patent numbers (one per line, using the full number like `US11223344B2` for best results) and click "Load Patent List." The navigator will appear on the patent page.

