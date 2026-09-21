// Service worker for the AI Support Agent Chrome Extension
// Handles badge updates and background state management

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    processedCount: 0,
    lastResult: null,
    serverUrl: "http://localhost:8000",
  });
  console.log("AI Support Agent extension installed.");
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_BADGE") {
    const count = message.count || 0;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
    chrome.action.setBadgeBackgroundColor({ color: "#6366f1" });
  }
  return true;
});
