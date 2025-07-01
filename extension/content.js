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
            console.log(`Extracted text from image ${i+1}:`, text);

            // OPENAI translation
            
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
