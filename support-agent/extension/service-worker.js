/**
 * AI Support Agent — Service Worker (Manifest V3)
 *
 * Responsibilities:
 *   - Register the right-click context menu on install
 *   - Handle context menu clicks (store selected text for popup)
 *   - Update the action badge count (badge text persisted in storage)
 *   - Forward badge update messages from the popup
 */

// ── Context Menu Setup ────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'process-as-email',
    title: 'Process as Support Email',
    contexts: ['selection'],
  });
});

// ── Context Menu Click ────────────────────────────────────────
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== 'process-as-email') return;

  // Store the selected text so popup can pre-fill it
  await chrome.storage.local.set({
    pendingText: info.selectionText,
    pendingTextTime: Date.now(),
  });

  // Flash the badge to prompt the user to open the popup
  await chrome.action.setBadgeText({ text: '★' });
  await chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
});

// ── Badge / Message Relay from Popup ─────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'UPDATE_BADGE') {
    (async () => {
      const count = message.count;
      await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
      await chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
      sendResponse({ ok: true });
    })();
    return true; // keep channel open for async response
  }

  if (message.type === 'CLEAR_BADGE') {
    (async () => {
      await chrome.action.setBadgeText({ text: '' });
      sendResponse({ ok: true });
    })();
    return true;
  }
});
