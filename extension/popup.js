document.addEventListener("DOMContentLoaded", function() {
	const toggleButton = document.getElementById("toggleSelection");
	const translateButton = document.getElementById("translateSelected")
	const clearButton = document.getElementById("clearSelection");
	const selectedCount = document.getElementById("selectedCount");
	const apiKeyInput = document.getElementById("apiKeyInput");
	const saveApiKeyButton = document.getElementById("saveApiKey");
	const deleteApiKeyButton = document.getElementById("deleteApiKey");
	const apiKeyStatus = document.getElementById("apiKeyStatus");

	// Track selection mode state
	let isSelectionModeActive = false;

	// Load saved API key on popup open
	loadApiKey();
	// Update selected count
	updateSelectedCount();
	// Check selection mode state
	checkSelectionModeState();

	// API Key management
	saveApiKeyButton.addEventListener("click", async () => {
		const apiKey = apiKeyInput.value.trim();
		if (!apiKey) {
			apiKeyStatus.textContent = "Please enter an API key";
			apiKeyStatus.style.color = "#dc3545";
			return;
		}

		try {
			await chrome.storage.local.set({ openai_api_key: apiKey });
			console.log("[K-Novel] API key saved successfully");
			// Clear the input field for security
			apiKeyInput.value = "";
			// Update status message
			apiKeyStatus.textContent = "API key saved successfully";
			apiKeyStatus.style.color = "#28a745";
		} 
		catch (error) {
			console.error("Error saving API key:", error);
			apiKeyStatus.textContent = "Error saving API key";
			apiKeyStatus.style.color = "#dc3545";
		}
	});

	deleteApiKeyButton.addEventListener("click", async () => {
		const confirmed = confirm("Are you sure you want to delete your saved API key?");
		if (!confirmed) return;

		try {
			await chrome.storage.local.remove(['openai_api_key']);
			console.log("[K-Novel] API key deleted successfully");
			// Clear the input field and update status
			apiKeyInput.value = "";
			apiKeyStatus.textContent = "API key deleted";
			apiKeyStatus.style.color = "#dc3545";
		} 
		catch (error) {
			console.error("Error deleting API key:", error);
			apiKeyStatus.textContent = "Error deleting API key";
			apiKeyStatus.style.color = "#dc3545";
		}
	});
	
	apiKeyInput.addEventListener("keypress", async (e) => {
		if (e.key === "Enter") {
			// Trigger the same logic as save button
			saveApiKeyButton.click();
		}
	});

	async function loadApiKey() {
		try {
			const result = await chrome.storage.local.get(['openai_api_key']);
			if (result.openai_api_key) {
				apiKeyInput.value = result.openai_api_key;
				apiKeyStatus.textContent = "API key loaded";
				apiKeyStatus.style.color = "#28a745";
			} 
			else {
				apiKeyStatus.textContent = "No API key loaded";
				apiKeyStatus.style.color = "#dc3545";
			}
		} 
		catch (error) {
			console.error("Error loading API key:", error);
			apiKeyStatus.textContent = "Error loading API key";
			apiKeyStatus.style.color = "#dc3545";
		}
	}

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

	translateButton.addEventListener("click", async () => {
		// Get current selection count for confirmation
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
		
		// Get the current count
		chrome.tabs.sendMessage(tab.id, { action: "getSelectedImages" }, (response) => {
			if (response && response.images !== undefined) {
				const imageCount = response.images;
				
				if (imageCount === 0) {
					alert("No images selected to translate.");
					return;
				}
				
				// Confirm translation
				const confirmed = confirm(`Translate ${imageCount} selected image${imageCount > 1 ? 's' : ''}? This will use your OpenAI API credits.`);
				
				if (confirmed) {
					chrome.tabs.sendMessage(tab.id, { action: "translateSelected" });
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