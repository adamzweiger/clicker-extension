// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const soundToggle = document.getElementById('toggleSound');
  const notifToggle = document.getElementById('toggleNotifications');
  const statusElement = document.getElementById('monitorStatus');
  const testButton = document.getElementById('testNotification');
  
  // Load saved settings
  chrome.storage.local.get(['soundEnabled', 'notificationsEnabled'], (result) => {
    if (result.soundEnabled !== undefined) {
      soundToggle.checked = result.soundEnabled;
    } else {
      // Default to true
      soundToggle.checked = true;
      chrome.storage.local.set({ soundEnabled: true });
    }
    
    if (result.notificationsEnabled !== undefined) {
      notifToggle.checked = result.notificationsEnabled;
    } else {
      // Default to true
      notifToggle.checked = true;
      chrome.storage.local.set({ notificationsEnabled: true });
    }
  });
  
  // Check if we have the tab open to update status
  chrome.tabs.query({url: "https://clicker.mit.edu/*"}, (tabs) => {
    if (!tabs || tabs.length === 0) {
      statusElement.innerHTML = "<span style='color: #880000;'>Status: Not active</span><br>" +
        "<span style='font-size: 0.9em;'>Please open the 6.102 Clicker page first:</span><br>" +
        "<span style='font-size: 0.9em;'>Navigate to <a href='https://clicker.mit.edu/6.102/' target='_blank'>https://clicker.mit.edu/6.102/</a></span>";
      return;
    }
    
    // Found at least one MIT Clicker tab
    console.log("Found MIT Clicker tabs:", tabs.length);
    
    // Default status while we check with content script
    statusElement.textContent = 'Status: Checking...';
    statusElement.style.color = '#888800';
    
    // Try to communicate with the content script
    try {
      chrome.tabs.sendMessage(tabs[0].id, { action: "getStatus" }, (response) => {
        // This checks if there was an error in message passing
        if (chrome.runtime.lastError) {
          console.log("Communication error:", chrome.runtime.lastError.message);
          statusElement.innerHTML = "<span style='color: #880000;'>Status: Content script not ready</span><br>" +
            "<span style='font-size: 0.9em;'>Please reload the Clicker page and reopen the extension </span><br>"
          return;
        }
        
        // We got a valid response from the content script
        if (response && response.isMonitoring) {
          statusElement.textContent = 'Status: Active & Monitoring';
          statusElement.style.color = '#008800';
        } else if (response) {
          statusElement.textContent = 'Status: Connected but idle';
          statusElement.style.color = '#888800';
        } else {
          statusElement.textContent = 'Status: Connected but no data';
          statusElement.style.color = '#880000';
        }
      });
    } catch (e) {
      console.error("Error when trying to send message:", e);
      statusElement.innerHTML = "<span style='color: #880000;'>Status: Error connecting to page</span><br>" +
        "<span style='font-size: 0.9em;'>Please reload both the Clicker page and the extension</span>";
    }
  });
  
  // Save settings when changed
  soundToggle.addEventListener('change', () => {
    const newValue = soundToggle.checked;
    chrome.storage.local.set({ soundEnabled: newValue });
    
    // Send message to content script
    sendSettingsToContentScript();
  });
  
  notifToggle.addEventListener('change', () => {
    const newValue = notifToggle.checked;
    
    if (newValue) {
      // Try to request the notification permission
      chrome.permissions.request({
        permissions: ['notifications']
      }, (granted) => {
        if (granted) {
          chrome.storage.local.set({ notificationsEnabled: true });
        } else {
          // If permission not granted, revert the toggle
          notifToggle.checked = false;
          chrome.storage.local.set({ notificationsEnabled: false });
        }
        
        // Send message to content script
        sendSettingsToContentScript();
      });
    } else {
      // User is disabling notifications
      chrome.storage.local.set({ notificationsEnabled: false });
      sendSettingsToContentScript();
    }
  });
  
  // Function to send settings to content script 
  function sendSettingsToContentScript() {
    chrome.tabs.query({url: "https://clicker.mit.edu/*"}, (tabs) => {
      if (!tabs || tabs.length === 0) {
        console.log("No MIT Clicker tabs found to update settings");
        return;
      }
      
      tabs.forEach(tab => {
        try {
          chrome.tabs.sendMessage(tab.id, { 
            action: "updateSettings", 
            soundEnabled: soundToggle.checked,
            notificationsEnabled: notifToggle.checked
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.log("Could not update settings:", chrome.runtime.lastError.message);
            } else {
              console.log("Settings updated successfully:", response);
            }
          });
        } catch (e) {
          console.error("Error sending settings to tab:", e);
        }
      });
    });
  }
  
  // Test notification button
  testButton.addEventListener('click', () => {
    // Play test sound if enabled
    if (soundToggle.checked) {
      const audio = new Audio(chrome.runtime.getURL('notification.mp3'));
      audio.volume = 0.7;
      audio.play().catch(e => console.log("Could not play sound:", e));
    }
    
    // Show test notification if enabled
    if (notifToggle.checked) {
      chrome.runtime.sendMessage({
        action: "testNotification"
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log("Error sending test notification:", chrome.runtime.lastError.message);
          alert("Error sending notification. Please check if notifications are enabled in your system settings.");
        } else {
          console.log("Test notification sent:", response);
          if (!response || !response.success) {
            alert("Notification may be blocked by your browser. Check system notification settings for Chrome.");
          }
        }
      });
    }
  });
});