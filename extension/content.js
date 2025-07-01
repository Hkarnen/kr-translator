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
                model: "gpt-4o-mini",
                messages: [
                    { 
                        role: "developer", 
                        content: "You are a helpful assistant that translates Korean text to English. Provide only the translation without any explanatory text." 
                    },
                    { 
                        role: "user", 
                        content: `Translate the following Korean text to English:\n\n${text}` 
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

    console.log(`[K-Novel Starting OCR for ${selectedImages.length} images`);

    try {
        const worker = await initTesseractWorker();

        for (let i = 0; i < selectedImages.length; i++) {
            // Process image
            console.log(`Processing image ${i+1} of ${selectedImages.length}`);
            const { data: { text } } = await worker.recognize(selectedImages[i]);

            // Log the extracted text - KOREAN
            console.log(`Extracted text from image ${i+1}:`, text);

            // Skip translation if no text was extracted
            if (!text || text.trim() === '') {
                console.log(`No text found in image ${i+1}, skipping translation`);
                continue;
            }

            // Translate the extracted text
            console.log(`Translating text from image ${i+1}...`);
            try {
                const translatedText = await translateText(text);
                // Log the translated text - ENGLISH
                console.log(`Translation for image ${i+1}:`, translatedText);
                
                // TODO: Display or store the translated text as needed
                
            } 
            catch (translationError) {
                console.error(`Failed to translate text from image ${i+1}:`, translationError);
            }
        }
        // Terminate worker when done
        await worker.terminate();
        tesseractWorker = null;
    }

    catch (error) {
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
