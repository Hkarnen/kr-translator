# kr-translator

A Chrome extension that translates Korean text from images into English, specifically designed for reading Korean novels where text is embedded in images.

Many Korean novel websites display their text content as images rather than selectable text. This makes it impossible for readers to translate their legally purchased novels, even with translation tools. This extension solves that problem by extracting text from images and translating it. 

> This extension is intended only for personal use with legally purchased content

## Current Features
- Image Selection: Click the extension (and toggle button) to enter selection mode, then click on the images you want
  - Selected images are highlighted in blue
  - Multiple images can be selected at once
- OCR: Extract Korean text from selected images using Tesseract.js
> Because of Manifest V3 blocking CDN Tesseract.js has to be downloaded too

## Tech Stack
- Manifest V3 Chrome Extension
- Tesseract.js for OCR (currently only Korean language support)
- Vanilla JS

## File Structure
```
extension/
├── icons/
│   ├── 16.png
│   ├── 32.png
│   ├── 48.png
│   ├── 128.png
│   └── icon512.png
├── tesseract/
│   ├── lang/
│   │   └── kor.traineddata
│   ├── tesseract-core-lstm.js
│   ├── tesseract-core-simd-lstm.wasm.js
│   ├── tesseract-core-simd.wasm.js
│   ├── tesseract-core.wasm.js
│   ├── tesseract.min.js
│   └── worker.min.js
├── content.js
├── manifest.json
├── popup.html
└── popup.js
 ```

## How to Use
1. Navigate to a Korean novel website
2. Click the extension icon
3. Click "Toggle Selection Mode"
4. Click on images you want
5. Click "Translate Selected Images" to extract text
6. Check browser console for extracted Korean text

## Installation
1. Clone this repository
2. Load extension in Chrome Developer Mode

## Future Plans
### Translation
- [X] OpenAI GPT-4 mini integration for translation
- [X] Display translation results
### UX
- [ ] Translation results displayed in new overlay / tab
- [ ] Font & font-size support

### Other Features
- [ ] Multiple language support

## Dependencies
- [Tesseract.js](https://github.com/naptha/tesseract.js) - Apache 2.0 License
