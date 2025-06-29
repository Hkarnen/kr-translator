# Tesseract.js + Chrome Extensions (Manifest V3)

Quick guide for integrating Tesseract.js OCR into Chrome Extensions with Manifest V3.

## The Problem

Manifest V3 blocks CDN scripts and dynamic imports, breaking default Tesseract.js setup.

## Solution: Local Bundle

### 1. Download Files
Get these from [Tesseract.js releases](https://github.com/naptha/tesseract.js/releases):
- `tesseract.min.js`
- `worker.min.js` 
- `tesseract-core-lstm.js`
- `tesseract-core-simd-lstm.wasm.js`
- `tesseract-core-simd.wasm.js`
- `tesseract-core.wasm.js`

>Tip: You could install tesseract through npm or yarn and copy in the files from `node_modules`

Download your needed language files from [tessdata](https://github.com/tesseract-ocr/tessdata) (e.g., `kor.traineddata` for Korean)

### 2. Manifest Setup
```json
{
  "manifest_version": 3,
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["/tesseract/tesseract.min.js", "content.js"],
    "run_at": "document_idle"
  }],
  "web_accessible_resources": [{
    "resources": ["tesseract/*"],
    "matches": ["<all_urls>"]
  }]
}
```

### 3. Worker Code
```javascript
// content.js
let tesseractWorker = null;

// Enable logging (optional)
Tesseract.setLogging(true);

async function initTesseractWorker() {
    if (!tesseractWorker) {
        tesseractWorker = await Tesseract.createWorker('kor', {
            workerBlobURL: false,  // CRITICAL for Manifest V3
            corePath: chrome.runtime.getURL("tesseract"),     // Pointing to the four wasm files
            workerPath: chrome.runtime.getURL("tesseract/worker.min.js"),
            langPath: chrome.runtime.getURL("tesseract/lang")   // No ending backslash
        });
    }
    return tesseractWorker;
}

// Usage
async function performOCR(imageElement) {
    const worker = await initTesseractWorker();
    const { data: { text } } = await worker.recognize(imageElement);
    console.log('Extracted text:', text);
    
    // Clean up when done
    await worker.terminate();
    tesseractWorker = null;
}
```

## Key Points

- **`workerBlobURL: false`** - Essential to avoid DataCloneError
- **Load order** - Include `tesseract.min.js` before your content script
- **Core files** - Tesseract automatically picks the best core file from the folder
- **Cleanup** - Terminate workers when done to free memory
