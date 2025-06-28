document.addEventListener("DOMContentLoaded", function() {
	const toggleButton = document.getElementById("toggleSelection");
	const clearButton = document.getElementById("clearSelection");
	const selectedCount = document.getElementById("selectedCount");

	// Update selected count on popup open
	updateSelectedCount();

	toggleButton.addEventListener("click", async () => {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
		chrome.tabs.sendMessage(tab.id, { action: "toggleSelection" });
		window.close();
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