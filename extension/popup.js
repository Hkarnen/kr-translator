document.addEventListener("DOMContentLoaded", function() {
	const toggleButton = document.getElementById("toggleSelection");
	const translateButton = document.getElementById("translateSelected")
	const clearButton = document.getElementById("clearSelection");
	const selectedCount = document.getElementById("selectedCount");
	const apiKeyInput = document.getElementById("apiKeyInput");
	const saveApiKeyButton = document.getElementById("saveApiKey");
	const apiKeyStatus = document.getElementById("apiKeyStatus");

	// Load saved API key on popup open
	loadApiKey();
	// Update selected count on popup open
	updateSelectedCount();

	// API Key management
	saveApiKeyButton.addEventListener("click", saveApiKey);
	
	apiKeyInput.addEventListener("keypress", (e) => {
		if (e.key === "Enter") {
			saveApiKey();
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

	async function saveApiKey() {
		const apiKey = apiKeyInput.value.trim();
		if (!apiKey) {
			apiKeyStatus.textContent = "Please enter an API key";
			apiKeyStatus.style.color = "#dc3545";
			return;
		}

		try {
			await chrome.storage.local.set({ openai_api_key: apiKey });
			apiKeyStatus.textContent = "API key saved successfully";
			apiKeyStatus.style.color = "#28a745";
		} 
		catch (error) {
			console.error("Error saving API key:", error);
			apiKeyStatus.textContent = "Error saving API key";
			apiKeyStatus.style.color = "#dc3545";
		}
	}

	toggleButton.addEventListener("click", async () => {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
		chrome.tabs.sendMessage(tab.id, { action: "toggleSelection" });
	});

	translateButton.addEventListener("click", async () => {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
		chrome.tabs.sendMessage(tab.id, { action: "translateSelected" });
	});
	
	clearButton.addEventListener("click", async () => {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
		chrome.tabs.sendMessage(tab.id, { action: "clearSelection" });
		//Update count after clearing
		setTimeout(updateSelectedCount, 100);
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

});