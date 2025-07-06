// Background script for handling translation window
let translationWindowId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "displayTranslation") {
        handleDisplayTranslation(message.originalText, message.translatedText);
    }
});

async function handleDisplayTranslation(originalText, translatedText) {
    try {
        // Check if translation window already exists
        if (translationWindowId) {
            try {
                await chrome.windows.get(translationWindowId);
                // Window exists, send message to it
                chrome.tabs.query({ windowId: translationWindowId }, (tabs) => {
                    if (tabs.length > 0) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: "addTranslation",
                            originalText: originalText,
                            translatedText: translatedText
                        });
                    }
                });
                
                // Focus the existing window
                chrome.windows.update(translationWindowId, { focused: true });
            } catch (error) {
                // Window was closed, create a new one
                translationWindowId = null;
                await createTranslationWindow(originalText, translatedText);
            }
        } else {
            // Create new translation window
            await createTranslationWindow(originalText, translatedText);
        }
    } catch (error) {
        console.error("[K-Novel] Error displaying translation:", error);
    }
}

async function createTranslationWindow(originalText, translatedText) {
    try {
        const window = await chrome.windows.create({
            url: chrome.runtime.getURL("translation-results.html"),
            type: "popup",
            width: 800,
            height: 600,
            focused: true
        });
        
        translationWindowId = window.id;
        
        // Wait a bit for the window to load, then send the translation
        setTimeout(() => {
            chrome.tabs.query({ windowId: translationWindowId }, (tabs) => {
                if (tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "addTranslation",
                        originalText: originalText,
                        translatedText: translatedText
                    });
                }
            });
        }, 500);
        
    } catch (error) {
        console.error("[K-Novel] Error creating translation window:", error);
    }
}

// Clean up when translation window is closed
chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId === translationWindowId) {
        translationWindowId = null;
    }
});
