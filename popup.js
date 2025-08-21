let timerInterval;
let startTime;
let isRunning = false;

// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
  loadSavedSettings();
  setupEventListeners();
  setupMessageListener();
});

function setupEventListeners() {
  // Font selection
  document.getElementById('applyFont').addEventListener('click', applyFont);
  
  // Timer controls
  document.getElementById('startTimer').addEventListener('click', startTimer);
  document.getElementById('stopTimer').addEventListener('click', stopTimer);
  document.getElementById('resetTimer').addEventListener('click', resetTimer);
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
    }
  });
}

function loadSavedSettings() {
  chrome.storage.sync.get(['selectedFont', 'timerState'], function(result) {
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
    }
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


