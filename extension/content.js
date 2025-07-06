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
                allKoreanTexts.push(`=== Image ${i+1} ===\n${text.trim()}`);
            } else {
                console.log(`No text found in image ${i+1}`);
                allKoreanTexts.push(`=== Image ${i+1} ===\n[No text detected]`);
            }
        }

        // Terminate worker when done
        await worker.terminate();
        tesseractWorker = null;

        // Combine all extracted text
        const combinedText = allKoreanTexts.join('\n\n');
        
        // Display the extracted text in a new window or copy to clipboard
        displayExtractedText(combinedText);

    } catch (error) {
        console.error("[K-Novel] OCR error:", error);
        alert(`OCR extraction failed: ${error.message}`);
    }
}

function displayExtractedText(text) {
    // Create a new window to display the extracted Korean text
    const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    
    if (newWindow) {
        newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Extracted Korean Text</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        line-height: 1.6;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                        background: #f5f5f5;
                    }
                    .container {
                        background: white;
                        padding: 30px;
                        border-radius: 10px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    h1 {
                        color: #333;
                        text-align: center;
                        border-bottom: 2px solid #007bff;
                        padding-bottom: 10px;
                    }
                    .text-content {
                        background: #f8f9fa;
                        padding: 20px;
                        border-radius: 5px;
                        border-left: 4px solid #007bff;
                        white-space: pre-wrap;
                        font-size: 16px;
                        line-height: 1.8;
                    }
                    .copy-button {
                        background: #28a745;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 16px;
                        margin-top: 20px;
                        display: block;
                        margin-left: auto;
                        margin-right: auto;
                    }
                    .copy-button:hover {
                        background: #218838;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🔍 Extracted Korean Text</h1>
                    <div class="text-content" id="extractedText">${text.replace(/\n/g, '<br>')}</div>
                    <button class="copy-button" onclick="copyToClipboard()">📋 Copy All Text</button>
                </div>
                
                <script>
                    function copyToClipboard() {
                        const text = \`${text}\`;
                        navigator.clipboard.writeText(text).then(() => {
                            alert('Text copied to clipboard!');
                        }).catch(err => {
                            console.error('Failed to copy text: ', err);
                            // Fallback for older browsers
                            const textArea = document.createElement('textarea');
                            textArea.value = text;
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                            alert('Text copied to clipboard!');
                        });
                    }
                </script>
            </body>
            </html>
        `);
        newWindow.document.close();
    } else {
        // Fallback: copy to clipboard and show alert
        navigator.clipboard.writeText(text).then(() => {
            alert('Extracted text copied to clipboard!\\n\\nWindow popup was blocked, but text is in your clipboard.');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Extracted text:\\n\\n' + text);
        });
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
