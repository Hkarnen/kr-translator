let selectedImages = [];
let selectionMode = false;

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
});

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
