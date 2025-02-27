// content.js
// Main script that runs on the MIT Clicker page

console.log('[6.102 Clicker Monitor] Content script loaded');

// Configuration
const CHECK_INTERVAL = 500; // Check every 500 milliseconds
let lastOpenState = null;
let checkCount = 0;
let monitorInterval = null;
let audioElement = null;
let settings = {
  soundEnabled: true,
  notificationsEnabled: true
};

// Initialize audio element
function initAudio() {
  try {
    audioElement = new Audio(chrome.runtime.getURL('notification.mp3'));
    audioElement.volume = 0.7; // Set volume to 70%
    
    // Preload the audio file
    audioElement.load();
    console.log('[6.102 Clicker Monitor] Audio initialized');
  } catch (e) {
    console.error('[6.102 Clicker Monitor] Error initializing audio:', e);
  }
}

// Function to check if the question is open
function isQuestionOpen() {
  try {
    const tbody = document.querySelector('tbody.choices');
    return tbody && tbody.classList.contains('open');
  } catch (e) {
    console.error('[6.102 Clicker Monitor] Error checking question state:', e);
    return false;
  }
}

// Function to check for changes
function checkForChanges() {
  checkCount++;
  
  // Get current open state
  const currentlyOpen = isQuestionOpen();
  
  // For the first run, just store the initial state
  if (lastOpenState === null) {
    lastOpenState = currentlyOpen;
    console.log('[6.102 Clicker Monitor] Initial state recorded:', currentlyOpen ? 'OPEN' : 'CLOSED');
    return;
  }
  
  // Check ONLY for closed → open transition
  if (currentlyOpen && !lastOpenState) {
    console.log('[6.102 Clicker Monitor] QUESTION OPENED!');
    
    // Play notification sound if enabled
    if (settings.soundEnabled && audioElement) {
      audioElement.play().catch(e => console.error('[6.102 Clicker Monitor] Could not play notification sound:', e));
    }
    
    // Show notification if enabled
    if (settings.notificationsEnabled) {
      chrome.runtime.sendMessage({
        action: "showNotification",
        title: "6.102 Clicker Question Opened!",
        message: "A new question is now open for responses."
      }, response => {
        if (chrome.runtime.lastError) {
          console.error('[6.102 Clicker Monitor] Error sending notification:', chrome.runtime.lastError);
        } else {
          console.log('[6.102 Clicker Monitor] Notification result:', response);
        }
      });
    }
  }
  
  // Always update the state
  lastOpenState = currentlyOpen;
}

// Start monitoring
function startMonitoring() {
  // Clear any existing interval
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  
  // Initialize audio for sound notifications
  initAudio();
  
  // Load saved settings
  chrome.storage.local.get(['soundEnabled', 'notificationsEnabled'], (result) => {
    if (result.soundEnabled !== undefined) {
      settings.soundEnabled = result.soundEnabled;
    }
    
    if (result.notificationsEnabled !== undefined) {
      settings.notificationsEnabled = result.notificationsEnabled;
    }
    
    console.log('[6.102 Clicker Monitor] Settings loaded:', settings);
    
    // Start a new monitoring interval
    monitorInterval = setInterval(checkForChanges, CHECK_INTERVAL);
    console.log('[6.102 Clicker Monitor] Monitoring started');
  });
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[6.102 Clicker Monitor] Message received:', message.action);
  
  // Always respond immediately to keep the connection alive
  if (message.action === "getStatus") {
    sendResponse({
      isMonitoring: !!monitorInterval,
      lastOpenState: lastOpenState,
      settings: settings,
      checkCount: checkCount
    });
    return true;
  }
  
  if (message.action === "updateSettings") {
    settings.soundEnabled = message.soundEnabled;
    settings.notificationsEnabled = message.notificationsEnabled;
    console.log('[6.102 Clicker Monitor] Settings updated:', settings);
    sendResponse({status: "Settings updated successfully"});
    return true;
  }
  
  if (message.action === "testSound") {
    if (audioElement) {
      audioElement.play()
        .then(() => sendResponse({status: "Sound played successfully"}))
        .catch(e => {
          console.error('[6.102 Clicker Monitor] Error playing test sound:', e);
          sendResponse({status: "Error playing sound", error: e.message});
        });
      return true;
    } else {
      sendResponse({status: "Audio not initialized"});
      return true;
    }
  }
  
  // Default response
  sendResponse({status: "Unknown action"});
  return true;
});

// Start monitoring when the script loads
console.log('[6.102 Clicker Monitor] Starting monitoring');
startMonitoring();

// Handle page visibility changes to ensure monitoring continues
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Page is now visible, ensure monitoring is active
    if (!monitorInterval) {
      console.log('[6.102 Clicker Monitor] Page visible, restarting monitoring');
      startMonitoring();
    }
  }
});

// Ensure monitoring starts/restarts when the page is fully loaded
window.addEventListener('load', () => {
  console.log('[6.102 Clicker Monitor] Window loaded, ensuring monitoring is active');
  if (!monitorInterval) {
    startMonitoring();
  }
});