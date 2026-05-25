chrome.runtime.onInstalled.addListener(() => {
  console.log("CSS Variables extension installed.");
});


chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  if (downloadItem.filename.includes("Rapport") || downloadItem.url.includes("pdf")) {
    // Example: retrieve the connected account in the tab.
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const account = document.querySelector('[aria-label*="Account"]')?.textContent || "account";
          return account.trim().replace(/\s+/g, "_");
        }
      }, ([{ result: accountName }]) => {
        const timestamp = new Date().toISOString().split("T")[0];
        const newName = `${accountName}_${timestamp}.pdf`;
        suggest({ filename: newName });
      });
    });

    // Required to avoid blocking the download.
    suggest();
  } else {
    suggest(); // Let other files pass through.
  }
});
