// Translation results window functionality
let translationCount = 0;
let translations = []; // Store all translations

document.addEventListener('DOMContentLoaded', function() {
    const fontFamilySelect = document.getElementById('fontFamily');
    const fontSizeSlider = document.getElementById('fontSize');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const clearButton = document.getElementById('clearResults');
    const container = document.getElementById('translationContainer');

    // Load saved data when window opens
    loadSavedTranslations();
    loadFontPreferences();

    // Font controls
    fontFamilySelect.addEventListener('change', updateFontFamily);
    fontSizeSlider.addEventListener('input', updateFontSize);
    clearButton.addEventListener('click', clearAllTranslations);

    // Auto-save every 10 seconds
    setInterval(saveTranslations, 10000);

    function loadSavedTranslations() {
        chrome.storage.local.get(['saved_translations'], (result) => {
            if (result.saved_translations && result.saved_translations.length > 0) {
                translations = result.saved_translations;
                translationCount = translations.length;
                
                // Render all saved translations
                container.innerHTML = '';
                translations.forEach((translation, index) => {
                    renderTranslationItem(translation.originalText, translation.translatedText, index + 1);
                });
                
                console.log(`[K-Novel] Loaded ${translations.length} saved translations`);
            }
        });
    }

    function saveTranslations() {
        chrome.storage.local.set({
            saved_translations: translations
        });
    }

    function updateFontFamily() {
        const fontFamily = fontFamilySelect.value;
        document.documentElement.style.setProperty('--translation-font-family', fontFamily);
        saveFontPreferences();
    }

    function updateFontSize() {
        const fontSize = fontSizeSlider.value + 'px';
        document.documentElement.style.setProperty('--translation-font-size', fontSize);
        fontSizeValue.textContent = fontSize;
        saveFontPreferences();
    }

    function saveFontPreferences() {
        chrome.storage.local.set({
            translation_font_family: fontFamilySelect.value,
            translation_font_size: fontSizeSlider.value
        });
    }

    function loadFontPreferences() {
        chrome.storage.local.get(['translation_font_family', 'translation_font_size'], (result) => {
            if (result.translation_font_family) {
                fontFamilySelect.value = result.translation_font_family;
                updateFontFamily();
            }
            if (result.translation_font_size) {
                fontSizeSlider.value = result.translation_font_size;
                updateFontSize();
            }
        });
    }

    function clearAllTranslations() {
        const confirmed = confirm('Clear all translation results? This will permanently delete all saved translations.');
        if (confirmed) {
            container.innerHTML = `
                <div class="empty-state">
                    <h2>No translations yet</h2>
                    <p>Translations from your selected images will appear here.</p>
                </div>
            `;
            translations = [];
            translationCount = 0;
            saveTranslations(); // Save the empty state
        }
    }

    // Listen for translation data from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("[K-Novel] Translation results received message:", message);
        if (message.action === 'addTranslation') {
            addTranslationResult(message.originalText, message.translatedText);
            sendResponse({success: true});
        }
    });

    function addTranslationResult(originalText, translatedText) {
        // Remove empty state if it exists
        if (translationCount === 0) {
            container.innerHTML = '';
        }

        translationCount++;
        
        // Add to stored translations
        const newTranslation = {
            originalText: originalText,
            translatedText: translatedText,
            timestamp: new Date().toISOString()
        };
        translations.push(newTranslation);
        
        // Render the new translation
        renderTranslationItem(originalText, translatedText, translationCount);
        
        // Save to storage
        saveTranslations();
        
        console.log(`[K-Novel] Added translation #${translationCount}, total saved: ${translations.length}`);
    }

    function renderTranslationItem(originalText, translatedText, itemNumber) {
        const translationItem = document.createElement('div');
        translationItem.className = 'translation-item';
        
        // Only show Korean text section if we have original text
        const koreanSection = originalText && originalText.trim() ? `
            <div class="original-text">
                <h4>Original Korean Text:</h4>
                <div class="korean-text">${escapeHtml(originalText)}</div>
            </div>
        ` : '';
        
        translationItem.innerHTML = `
            <div class="translation-header">
                Translation #${itemNumber}
                <span class="timestamp">${formatTimestamp(new Date())}</span>
            </div>
            ${koreanSection}
            <div class="translated-text">
                <h4>English Translation:</h4>
                <div class="english-text">${formatTranslationText(translatedText)}</div>
            </div>
        `;

        container.appendChild(translationItem);
        
        // Scroll to the new translation
        translationItem.scrollIntoView({ behavior: 'smooth' });
    }

    function formatTimestamp(date) {
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    }

    function formatTranslationText(text) {
        // Let OpenAI handle formatting - just convert line breaks to HTML
        let formattedText = text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
        
        // Wrap in paragraph tags if we have paragraph breaks
        if (formattedText.includes('</p><p>')) {
            formattedText = '<p>' + formattedText + '</p>';
        }
        
        return formattedText;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        // Replace line breaks with <br> tags to preserve formatting
        return div.innerHTML.replace(/\n/g, '<br>');
    }
});
