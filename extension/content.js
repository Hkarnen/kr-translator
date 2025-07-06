let selectedImages = [];
let selectionMode = false;
let tesseractWorker = null;

Tesseract.setLogging(true);

// Listen for popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "toggleSelection") {
        toggleSelectionMode();
    }
    else if (message.action === "getSelectedImages") {
        sendResponse({ images: selectedImages.length });
    }
    else if (message.action === "getSelectionModeState") {
        console.log("[K-Novel] Selection mode state requested:", selectionMode);
        sendResponse({ isActive: selectionMode });
    }
    else if (message.action === "clearSelection") {
        clearSelection();
    }
    else if (message.action === "translateSelected") {
        translateSelectedImages();
    }
});

async function initTesseractWorker() {
    // Create a worker if not already created
    if (!tesseractWorker) {
        tesseractWorker = await Tesseract.createWorker('kor', {
            workerBlobURL: false,
            corePath: chrome.runtime.getURL("tesseract"),
            workerPath: chrome.runtime.getURL("tesseract/worker.min.js"),
            langPath: chrome.runtime.getURL("tesseract/lang"),
        })

    }

    return tesseractWorker;
}

async function translateText(text) {
    try {
        console.log("Translating text:", text);
        
        // Get API key from storage
        const result = await chrome.storage.local.get(['openai_api_key']);
        const apiKey = result.openai_api_key;
        
        if (!apiKey) {
            throw new Error("No OpenAI API key found. Please set your API key in the extension popup.");
        }
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4.1",
                messages: [
                    { 
                        role: "system", 
                        content: "You are a helpful assistant that translates Korean text to English. When translating multiple text segments, provide a single flowing English translation that reads naturally with proper paragraph breaks. Use double line breaks (\\n\\n) between paragraphs for better readability. Do not include any Korean text in your response, only provide the well-formatted English translation." 
                    },
                    { 
                        role: "user", 
                        content: `Translate the following Korean text to English as a single flowing passage with proper paragraph formatting:\n\n${text}` 
                    }
                ],
                temperature: 0.3 
            })
        });

        // Check if response is ok
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Translation API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
           
        const translatedText = data.choices[0].message.content.trim();
        console.log("Translation result:", translatedText);
        
        return translatedText;
    } 
    catch (error) {
        console.error("[K-Novel] Translation error:", error);
        throw error;
    }
}

async function translateSelectedImages() {
    if (selectedImages.length === 0) {
        console.log("[K-Novel] No images selected");
        return;
    }

    console.log(`[K-Novel] Starting OCR for ${selectedImages.length} images`);

    try {
        const worker = await initTesseractWorker();
        const koreanTexts = [];

        // Extract Korean text from all images
        for (let i = 0; i < selectedImages.length; i++) {
            console.log(`Processing image ${i+1} of ${selectedImages.length}`);
            const { data: { text } } = await worker.recognize(selectedImages[i]);

            console.log(`Extracted text from image ${i+1}:`, text);

            // Collect all text
            if (text && text.trim() !== '') {
                koreanTexts.push(text.trim());
            }
        }

        // Terminate worker after OCR
        await worker.terminate();
        tesseractWorker = null;

        // If we have Korean texts, translate them as one batch
        if (koreanTexts.length > 0) {
            console.log(`Translating ${koreanTexts.length} texts as one batch...`);
            
            // Join all Korean texts with line breaks
            const combinedKoreanText = koreanTexts.join('\n\n');
            
            try {
                const translatedText = await translateText(combinedKoreanText);
                console.log("Combined translation result:", translatedText);
                
                // Send the combined translation to results window
                console.log("[K-Novel] Sending translation to background script...");
                chrome.runtime.sendMessage({
                    action: "displayTranslation",
                    originalText: "", // Don't show Korean text
                    translatedText: translatedText
                }, (response) => {
                    console.log("[K-Novel] Background script response:", response);
                });
                
            } catch (translationError) {
                console.error("[K-Novel] Translation failed:", translationError);
                alert(`Translation failed: ${translationError.message}`);
            }
        } else {
            console.log("[K-Novel] No text extracted from any images");
        }

    } catch (error) {
        console.error("[K-Novel] OCR error:", error);
    }
}

function toggleSelectionMode() {
    selectionMode = !selectionMode;
    if (selectionMode) {
        startSelectionMode();
    }
    else {
        endSelectionMode();
    }
}

function startSelectionMode() {
    // Add visual indicator
    document.body.style.cursor = "croshair";
    // Add click listeners to all images
    const images = document.querySelectorAll("img");
    images.forEach(img => {
        img.addEventListener('click', handleImageClick, {capture: true});
    });

    console.log("[K-Novel] Selection mode activated");
}

function handleImageClick(event) {
    if (!selectionMode) return;

    event.preventDefault();
    event.stopPropagation();

    const img = event.target;

    // Toggle selection
    const index = selectedImages.findIndex(selected => selected == img);
    if (index > -1) {
        // Remove from selection
        selectedImages.splice(index, 1);
        img.style.outline = "";
    }
    else {
        // Add to selection
        selectedImages.push(img);
        img.style.outline = "10px solid #007bff";
    }

    console.log(`[K-Novel] Selected images: ${selectedImages.length}`);
}

function endSelectionMode() {
    document.body.style.cursor = "";

    // Remove click listeners
    const images = document.querySelectorAll("img");
    images.forEach(img => {
        img.removeEventListener('click', handleImageClick, {capture: true});
    });

    console.log("[K-Novel] Selection mode deactivated");
}

function clearSelection() {
    // Remove outlines from all selected images
    selectedImages.forEach(img => {
        img.style.outline = '';
        img.style.outlineOffset = '';
    });
    
    // Clear the array
    selectedImages = [];
    console.log('[K-Novel] Selection cleared');
}
