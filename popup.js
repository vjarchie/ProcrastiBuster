let timerInterval;
let startTime;
let isRunning = false;

// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
  loadSavedSettings();
  setupEventListeners();
  setupMessageListener();
  
  // Check state periodically to stay in sync
  setInterval(checkStates, 2000);
  
  // Check state when popup becomes visible
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      checkStates();
    }
  });
});

function checkStates() {
  // Only check if popup is visible
  if (document.visibilityState === 'visible') {
    checkTimerState();
    checkWindowedReadingState();
  }
}

function setupEventListeners() {
  // Font selection
  document.getElementById('applyFont').addEventListener('click', applyFont);
  
  // Timer controls
  document.getElementById('startTimer').addEventListener('click', startTimer);
  document.getElementById('stopTimer').addEventListener('click', stopTimer);
  document.getElementById('resetTimer').addEventListener('click', resetTimer);
  
  // Windowed reading controls
  document.getElementById('enableWindowedReading').addEventListener('click', enableWindowedReading);
  document.getElementById('disableWindowedReading').addEventListener('click', disableWindowedReading);
}

function setupMessageListener() {
  // Listen for messages from content script
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'timerStoppedFromWidget') {
      // Timer was stopped from the widget, update popup state
      isRunning = false;
      clearInterval(timerInterval);
      updateTimerButtons();
      
      // Clear saved state
      chrome.storage.sync.remove(['timerState']);
      
      // Update display with final time
      document.getElementById('timerDisplay').textContent = formatTime(request.totalTime);
      
      showStatus('Timer stopped from page!', 'success');
    } else if (request.action === 'windowedReadingDisabledFromWidget') {
      // Windowed reading was disabled from the widget, update popup state
      updateWindowedReadingButtons(false);
      
      // Clear saved state
      chrome.storage.sync.remove(['windowedReadingState']);
      
      showStatus('Windowed reading disabled from page!', 'success');
    }
  });
}

function loadSavedSettings() {
  chrome.storage.sync.get(['selectedFont', 'timerState', 'windowedReadingState'], function(result) {
    if (result.selectedFont) {
      document.getElementById('fontSelect').value = result.selectedFont;
    }
    
    if (result.timerState) {
      const state = result.timerState;
      if (state.isRunning) {
        startTime = state.startTime;
        isRunning = true;
        updateTimerDisplay();
        startTimerInterval();
        updateTimerButtons();
      }
    } else {
      // Check if timer is actually running on the page
      checkTimerState();
    }
    
    if (result.windowedReadingState && result.windowedReadingState.isActive) {
      updateWindowedReadingButtons(true);
    } else {
      // Check if windowed reading is actually active on the page
      checkWindowedReadingState();
    }
  });
}

function checkTimerState() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs.length === 0) return;
    
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'checkTimerState'
    }, function(response) {
      if (chrome.runtime.lastError) {
        // Tab might not be ready, ignore error
        return;
      }
      if (response && response.isRunning && !isRunning) {
        // Timer is running on page but not in popup, sync the state
        startTime = response.startTime;
        isRunning = true;
        updateTimerDisplay();
        startTimerInterval();
        updateTimerButtons();
      } else if (response && !response.isRunning && isRunning) {
        // Timer is not running on page but is running in popup, sync the state
        isRunning = false;
        clearInterval(timerInterval);
        updateTimerButtons();
      }
    });
  });
}

function checkWindowedReadingState() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs.length === 0) return;
    
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'checkWindowedReadingState'
    }, function(response) {
      if (chrome.runtime.lastError) {
        // Tab might not be ready, ignore error
        return;
      }
      if (response && response.isActive) {
        updateWindowedReadingButtons(true);
      } else {
        updateWindowedReadingButtons(false);
      }
    });
  });
}

function applyFont() {
  const selectedFont = document.getElementById('fontSelect').value;
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      function: changePageFont,
      args: [selectedFont]
    }, function() {
      // Save the selected font
      chrome.storage.sync.set({selectedFont: selectedFont});
      showStatus('Font applied successfully!', 'success');
    });
  });
}

function changePageFont(fontName) {
  if (fontName === 'default') {
    // Remove custom font styles
    const existingStyle = document.getElementById('reading-enhancement-font');
    if (existingStyle) {
      existingStyle.remove();
    }
    return;
  }

  // Remove existing font style
  const existingStyle = document.getElementById('reading-enhancement-font');
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element
  const style = document.createElement('style');
  style.id = 'reading-enhancement-font';
  
  const fontUrl = chrome.runtime.getURL(`fonts/${fontName}.ttf`);
  
  style.textContent = `
    @font-face {
      font-family: '${fontName}';
      src: url('${fontUrl}') format('truetype');
    }
    
    body, p, div, span, h1, h2, h3, h4, h5, h6, li, td, th {
      font-family: '${fontName}', sans-serif !important;
    }
  `;
  
  document.head.appendChild(style);
}

function startTimer() {
  if (!isRunning) {
    startTime = Date.now();
    isRunning = true;
    startTimerInterval();
    updateTimerButtons();
    
    // Save timer state
    chrome.storage.sync.set({
      timerState: {
        isRunning: true,
        startTime: startTime
      }
    });
    
    // Send message to content script to show timer widget
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'showTimer',
        startTime: startTime
      });
    });
    
    showStatus('Timer started!', 'success');
  }
}

function stopTimer() {
  if (isRunning) {
    isRunning = false;
    clearInterval(timerInterval);
    updateTimerButtons();
    
    const totalTime = Date.now() - startTime;
    const timeString = formatTime(totalTime);
    
    // Clear saved state
    chrome.storage.sync.remove(['timerState']);
    
    // Send message to content script to hide timer widget and show celebration
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'stopTimer',
        totalTime: totalTime
      });
    });
    
    showStatus('Timer stopped!', 'success');
  }
}

function resetTimer() {
  isRunning = false;
  clearInterval(timerInterval);
  startTime = null;
  document.getElementById('timerDisplay').textContent = '00:00:00';
  updateTimerButtons();
  
  // Clear saved state
  chrome.storage.sync.remove(['timerState']);
  
  showStatus('Timer reset!', 'success');
}

function startTimerInterval() {
  timerInterval = setInterval(updateTimerDisplay, 1000);
}

function updateTimerDisplay() {
  if (startTime && isRunning) {
    const elapsed = Date.now() - startTime;
    document.getElementById('timerDisplay').textContent = formatTime(elapsed);
  }
}

function updateTimerButtons() {
  document.getElementById('startTimer').disabled = isRunning;
  document.getElementById('stopTimer').disabled = !isRunning;
}

function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}

// Windowed Reading Functions
function enableWindowedReading() {
  const windowSize = document.getElementById('windowSize').value;
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'enableWindowedReading',
      windowSize: windowSize
    }, function(response) {
      if (response && response.success) {
        updateWindowedReadingButtons(true);
        // Save state
        chrome.storage.sync.set({
          windowedReadingState: {
            isActive: true,
            windowSize: windowSize
          }
        });
        showStatus('Windowed reading enabled!', 'success');
      } else {
        showStatus('Failed to enable windowed reading', 'error');
      }
    });
  });
}

function disableWindowedReading() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'disableWindowedReading'
    }, function(response) {
      if (response && response.success) {
        updateWindowedReadingButtons(false);
        // Clear state
        chrome.storage.sync.remove(['windowedReadingState']);
        showStatus('Windowed reading disabled!', 'success');
      } else {
        showStatus('Failed to disable windowed reading', 'error');
      }
    });
  });
}

function updateWindowedReadingButtons(isEnabled) {
  document.getElementById('enableWindowedReading').disabled = isEnabled;
  document.getElementById('disableWindowedReading').disabled = !isEnabled;
}


