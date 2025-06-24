document.getElementById("run").addEventListener("click", async () => {
  // find the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // inject an inline function that just logs to the page console
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => console.log("[K-Novel] Hello from injected script!")
  });

  // close the popup so it doesn’t linger
  window.close();
});