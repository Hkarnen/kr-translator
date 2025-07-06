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
    else if (message.action === "extractText") {
        extractTextFromSelectedImages();
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

async function extractTextFromSelectedImages() {
    if (selectedImages.length === 0) {
        console.log("[K-Novel] No images selected");
        alert("No images selected for text extraction.");
        return;
    }

    console.log(`[K-Novel] Starting OCR for ${selectedImages.length} images`);

    try {
        const worker = await initTesseractWorker();
        const allKoreanTexts = [];

        for (let i = 0; i < selectedImages.length; i++) {
            console.log(`Processing image ${i+1} of ${selectedImages.length}`);
            const { data: { text } } = await worker.recognize(selectedImages[i]);

            console.log(`Extracted text from image ${i+1}:`, text);

            if (text && text.trim() !== '') {
                allKoreanTexts.push(text.trim());
            } else {
                console.log(`No text found in image ${i+1}`);
            }
        }

        // Terminate worker when done
        await worker.terminate();
        tesseractWorker = null;

        // Combine all extracted text with double line breaks for better readability
        const combinedText = allKoreanTexts.join('\n\n');
        
        // Display the extracted text in a new window or copy to clipboard
        displayExtractedText(combinedText);

    } 
    catch (error) {
        console.error("[K-Novel] OCR error:", error);
        alert(`OCR extraction failed: ${error.message}`);
    }
}

function displayExtractedText(text) {
    // Create a new window to display the extracted text
    const newWindow = window.open('', '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
    
    if (newWindow) {
        // Set up the document
        newWindow.document.title = 'Extracted Text';
        
        // Add basic styling
        const style = newWindow.document.createElement('style');
        style.textContent = `
            body { font-family: Arial, sans-serif; padding: 20px; }
            pre { white-space: pre-wrap; font-size: 14px; line-height: 1.4; }
            button { padding: 8px 16px; margin-top: 10px; }
        `;
        newWindow.document.head.appendChild(style);
        
        // Add the text
        const pre = newWindow.document.createElement('pre');
        pre.textContent = text;
        newWindow.document.body.appendChild(pre);
        
        // Add copy button
        const button = newWindow.document.createElement('button');
        button.textContent = 'Copy';
        button.addEventListener('click', () => {
            newWindow.navigator.clipboard.writeText(text).then(() => {
                newWindow.alert('Text copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                newWindow.alert('Copy failed. Please select and copy manually.');
            });
        });
        newWindow.document.body.appendChild(button);
    } else {
        alert("Failed to open new window for displaying extracted text. Please check your popup blocker settings.");
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
