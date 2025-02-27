// background.js
console.log('[6.102 Clicker Monitor] Background service worker started');

// Handle notification requests from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[6.102 Clicker Monitor] Background received message:', message.action);
  
  if (message.action === "showNotification") {
    // Try to create notification with basic error handling
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: message.title || '6.102 Clicker Notification',
        message: message.message || 'Question status has changed',
        priority: 2
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.error('[6.102 Clicker Monitor] Notification error:', chrome.runtime.lastError.message);
          sendResponse({success: false, error: chrome.runtime.lastError.message});
        } else {
          console.log('[6.102 Clicker Monitor] Notification created with ID:', notificationId);
          sendResponse({success: true, id: notificationId});
        }
      });
    } catch (e) {
      console.error('[6.102 Clicker Monitor] Error creating notification:', e);
      sendResponse({success: false, error: e.message});
    }
    
    return true; // Keep the message channel open for async response
  }
  
  // Handle test notification from popup
  if (message.action === "testNotification") {
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Test Notification',
        message: 'This is a test notification from 6.102 Clicker Monitor',
        priority: 2
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.error('[6.102 Clicker Monitor] Test notification error:', chrome.runtime.lastError.message);
          sendResponse({success: false, error: chrome.runtime.lastError.message});
        } else {
          console.log('[6.102 Clicker Monitor] Test notification created with ID:', notificationId);
          sendResponse({success: true, id: notificationId});
        }
      });
    } catch (e) {
      console.error('[6.102 Clicker Monitor] Error creating test notification:', e);
      sendResponse({success: false, error: e.message});
    }
    
    return true;
  }
});

// Initialize default settings if not set
chrome.runtime.onInstalled.addListener(() => {
  console.log('[6.102 Clicker Monitor] Extension installed/updated');
  
  chrome.storage.local.get(['soundEnabled', 'notificationsEnabled'], (result) => {
    const defaultSettings = {};
    
    if (result.soundEnabled === undefined) {
      defaultSettings.soundEnabled = true;
    }
    
    if (result.notificationsEnabled === undefined) {
      defaultSettings.notificationsEnabled = true;
    }
    
    if (Object.keys(defaultSettings).length > 0) {
      chrome.storage.local.set(defaultSettings);
      console.log('[6.102 Clicker Monitor] Default settings initialized:', defaultSettings);
    }
  });
});