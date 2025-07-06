document.addEventListener("DOMContentLoaded", function() {
	const toggleButton = document.getElementById("toggleSelection");
	const extractButton = document.getElementById("extractText");
	const clearButton = document.getElementById("clearSelection");
	const selectedCount = document.getElementById("selectedCount");

	// Track selection mode state
	let isSelectionModeActive = false;

	// Update selected count on popup open
	updateSelectedCount();
	// Check selection mode state
	checkSelectionModeState();

	toggleButton.addEventListener("click", async () => {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
		chrome.tabs.sendMessage(tab.id, { action: "toggleSelection" });
		
		// Toggle the visual state
		isSelectionModeActive = !isSelectionModeActive;
		updateToggleButtonState();
	});

	function updateToggleButtonState() {
		if (isSelectionModeActive) {
			toggleButton.textContent = "Selection Mode ON";
			toggleButton.style.background = "#fd7e14"; // Orange color when active
			toggleButton.style.fontWeight = "bold";
		} 
		else {
			toggleButton.textContent = "Toggle Selection Mode";
			toggleButton.style.background = "#007bff"; // Blue
			toggleButton.style.fontWeight = "normal";
		}
	}

	extractButton.addEventListener("click", async () => {
		// Get current selection count for confirmation
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
		
		// Get the current count
		chrome.tabs.sendMessage(tab.id, { action: "getSelectedImages" }, (response) => {
			if (response && response.images !== undefined) {
				const imageCount = response.images;
				
				if (imageCount === 0) {
					alert("No images selected to extract text from.");
					return;
				}
				
				// Confirm extraction
				const confirmed = confirm(`Extract Korean text from ${imageCount} selected image${imageCount > 1 ? 's' : ''}?`);
				
				if (confirmed) {
					chrome.tabs.sendMessage(tab.id, { action: "extractText" });
				}
			}
		});
	});
	
	clearButton.addEventListener("click", async () => {
		// Get current selection count for confirmation
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
		
		chrome.tabs.sendMessage(tab.id, { action: "getSelectedImages" }, (response) => {
			if (response && response.images !== undefined) {
				const imageCount = response.images;
				
				if (imageCount === 0) {
					alert("No images selected to clear.");
					return;
				}
				
				// Confirm clearing
				const confirmed = confirm(`Clear selection of ${imageCount} image${imageCount > 1 ? 's' : ''}?`);
				
				if (confirmed) {
					chrome.tabs.sendMessage(tab.id, { action: "clearSelection" });
					// Update count after clearing
					setTimeout(updateSelectedCount, 100);
				}
			}
		});
	});

	async function updateSelectedCount() {
		try{
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
			chrome.tabs.sendMessage(tab.id, { action: "getSelectedImages" }, (response) => {
				if (response && response.images !== undefined) {
					selectedCount.textContent = `Selected: ${response.images}`;
				}
			});
		}
		catch (error) {
			console.log("[K-Novel] Could not get selected count");
		}
	}

	async function checkSelectionModeState() {
		try {
			console.log("[K-Novel] Checking selection mode state...");
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
			chrome.tabs.sendMessage(tab.id, { action: "getSelectionModeState" }, (response) => {
				if (chrome.runtime.lastError) {
					console.log("[K-Novel] Could not get selection mode state:", chrome.runtime.lastError);
					return;
				}
				if (response && response.isActive !== undefined) {
					isSelectionModeActive = response.isActive;
					updateToggleButtonState();
					console.log("[K-Novel] Synced selection mode state:", isSelectionModeActive);
				}
			});
		}
		catch (error) {
			console.log("[K-Novel] Could not get selection mode state:", error);
		}
	}

});