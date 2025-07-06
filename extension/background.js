// Background script for handling translation window
let translationWindowId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[K-Novel] Background received message:", message);
    if (message.action === "displayTranslation") {
        handleDisplayTranslation(message.originalText, message.translatedText);
        sendResponse({success: true});
    } else if (message.action === "openTranslationWindow") {
        openOrFocusTranslationWindow();
        sendResponse({success: true});
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
                        console.log("[K-Novel] Sending translation to existing window tab:", tabs[0].id);
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: "addTranslation",
                            originalText: originalText,
                            translatedText: translatedText
                        }, (response) => {
                            console.log("[K-Novel] Response from translation window:", response);
                        });
                    } else {
                        console.log("[K-Novel] No tabs found in translation window");
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
                    console.log("[K-Novel] Sending translation to new window tab:", tabs[0].id);
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "addTranslation",
                        originalText: originalText,
                        translatedText: translatedText
                    }, (response) => {
                        console.log("[K-Novel] Response from new translation window:", response);
                    });
                } else {
                    console.log("[K-Novel] No tabs found in new translation window");
                }
            });
        }, 500);
        
    } catch (error) {
        console.error("[K-Novel] Error creating translation window:", error);
    }
}

async function openOrFocusTranslationWindow() {
    try {
        if (translationWindowId) {
            try {
                // Window exists, just focus it
                await chrome.windows.update(translationWindowId, { focused: true });
                console.log("[K-Novel] Focused existing translation window");
            } catch (error) {
                // Window was closed, create a new one
                translationWindowId = null;
                await createEmptyTranslationWindow();
            }
        } else {
            // Create new translation window
            await createEmptyTranslationWindow();
        }
    } catch (error) {
        console.error("[K-Novel] Error opening translation window:", error);
    }
}

async function createEmptyTranslationWindow() {
    try {
        const window = await chrome.windows.create({
            url: chrome.runtime.getURL("translation-results.html"),
            type: "popup",
            width: 800,
            height: 600,
            focused: true
        });
        
        translationWindowId = window.id;
        console.log("[K-Novel] Created new translation window");
        
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
