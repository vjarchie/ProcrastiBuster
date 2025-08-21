// Content script for reading enhancement plugin

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Apply saved font if any
  chrome.storage.sync.get(['selectedFont'], function(result) {
    if (result.selectedFont && result.selectedFont !== 'default') {
      applyFont(result.selectedFont);
    }
  });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'applyFont') {
    applyFont(request.fontName);
    sendResponse({success: true});
  } else if (request.action === 'showTimer') {
    showTimerWidget(request.startTime);
    sendResponse({success: true});
  } else if (request.action === 'stopTimer') {
    hideTimerWidget();
    showCelebrationPopup(request.totalTime);
    sendResponse({success: true});
  }
});

function applyFont(fontName) {
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
      font-display: swap;
    }
    
    body, p, div, span, h1, h2, h3, h4, h5, h6, li, td, th, article, section, main {
      font-family: '${fontName}', sans-serif !important;
    }
    
    /* Ensure good readability */
    body {
      line-height: 1.6 !important;
      letter-spacing: 0.01em !important;
    }
    
    p {
      margin-bottom: 1em !important;
    }
  `;
  
  document.head.appendChild(style);
}

// Show timer widget when started from popup
function showTimerWidget(startTime) {
  // Remove existing timer widget if any
  const existingWidget = document.getElementById('reading-timer-widget');
  if (existingWidget) {
    existingWidget.remove();
  }

  const timerWidget = document.createElement('div');
  timerWidget.id = 'reading-timer-widget';
  timerWidget.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 15px;
    border-radius: 10px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    backdrop-filter: blur(10px);
    min-width: 120px;
    text-align: center;
    transition: all 0.3s ease;
  `;

  timerWidget.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <div style="font-weight: bold;">🥊 ProcrastiBuster Timer</div>
      <button id="hide-timer-btn" style="
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 16px;
        padding: 0;
        margin: 0;
        line-height: 1;
      " title="Hide Timer">×</button>
    </div>
    <div id="timer-display" style="font-size: 18px; font-weight: bold; margin: 10px 0;">00:00:00</div>
    <div style="display: flex; gap: 5px; justify-content: center;">
      <button id="stop-timer-btn" style="
        background: #f44336;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 12px;
      ">Stop</button>
    </div>
  `;

  document.body.appendChild(timerWidget);

  // Timer functionality
  let timerInterval;
  let isRunning = true;

  const stopBtn = document.getElementById('stop-timer-btn');
  const display = document.getElementById('timer-display');
  const hideBtn = document.getElementById('hide-timer-btn');

  // Start the timer immediately
  timerInterval = setInterval(function() {
    const elapsed = Date.now() - startTime;
    display.textContent = formatTime(elapsed);
  }, 1000);

  // Add hide functionality
  hideBtn.addEventListener('click', function() {
    timerWidget.style.display = 'none';
    createShowTimerButton();
  });

  // Stop timer functionality
  stopBtn.addEventListener('click', function() {
    if (isRunning) {
      isRunning = false;
      clearInterval(timerInterval);
      
      const totalTime = Date.now() - startTime;
      const timeString = formatTime(totalTime);
      
      // Hide timer widget
      timerWidget.style.display = 'none';
      
      // Show celebration popup
      showCelebrationPopup(totalTime);
      
      // Also notify the popup that timer has been stopped
      chrome.runtime.sendMessage({
        action: 'timerStoppedFromWidget',
        totalTime: totalTime
      });
    }
  });

  function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Function to create a small button to show timer again
  function createShowTimerButton() {
    // Remove existing show button if any
    const existingShowBtn = document.getElementById('show-timer-btn');
    if (existingShowBtn) {
      existingShowBtn.remove();
    }

    const showBtn = document.createElement('div');
    showBtn.id = 'show-timer-btn';
    showBtn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      font-size: 18px;
    `;
    showBtn.innerHTML = '⏱️';
    showBtn.title = 'Show Reading Timer';

    showBtn.addEventListener('click', function() {
      showBtn.remove();
      timerWidget.style.display = 'block';
    });

    showBtn.addEventListener('mouseenter', function() {
      this.style.transform = 'scale(1.1)';
    });

    showBtn.addEventListener('mouseleave', function() {
      this.style.transform = 'scale(1)';
    });

    document.body.appendChild(showBtn);
  }
}

// Hide timer widget
function hideTimerWidget() {
  const timerWidget = document.getElementById('reading-timer-widget');
  const showBtn = document.getElementById('show-timer-btn');
  
  if (timerWidget) {
    timerWidget.remove();
  }
  if (showBtn) {
    showBtn.remove();
  }
}

// Show celebration popup
function showCelebrationPopup(totalTime) {
  const timeString = formatTime(totalTime);
  
  // Remove existing popup if any
  const existingPopup = document.getElementById('celebration-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  const popup = document.createElement('div');
  popup.id = 'celebration-popup';
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 30px;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    z-index: 10001;
    text-align: center;
    font-family: Arial, sans-serif;
    min-width: 300px;
    animation: popIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  `;

  popup.innerHTML = `
    <h2 style="margin: 0 0 15px 0; font-size: 24px;">🥊 Procrastination Busted! 🎉</h2>
    <p style="margin: 0 0 20px 0; font-size: 16px;">You've completed your reading session!</p>
    <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 10px; margin: 20px 0;">
      <p style="margin: 0; font-size: 18px; font-weight: bold;">Total Reading Time:</p>
      <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold;">${timeString}</p>
    </div>
    <button id="close-celebration" style="
      background: rgba(255,255,255,0.2);
      border: 2px solid white;
      color: white;
      padding: 10px 20px;
      border-radius: 25px;
      cursor: pointer;
      font-size: 16px;
      transition: all 0.3s;
    ">Close</button>
  `;

  document.body.appendChild(popup);

  // Add close functionality
  document.getElementById('close-celebration').addEventListener('click', function() {
    popup.remove();
  });

  // Auto-close after 10 seconds
  setTimeout(() => {
    if (popup.parentNode) {
      popup.remove();
    }
  }, 10000);
}

function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Handle page visibility changes (tab switching)
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    // Page is hidden (tab switched), hide timer widgets
    const timerWidget = document.getElementById('reading-timer-widget');
    const showBtn = document.getElementById('show-timer-btn');
    
    if (timerWidget) {
      timerWidget.style.display = 'none';
    }
    if (showBtn) {
      showBtn.style.display = 'none';
    }
  } else {
    // Page is visible again, show timer widgets if they exist
    const timerWidget = document.getElementById('reading-timer-widget');
    const showBtn = document.getElementById('show-timer-btn');
    
    if (timerWidget && timerWidget.style.display !== 'none') {
      timerWidget.style.display = 'block';
    }
    if (showBtn && showBtn.style.display !== 'none') {
      showBtn.style.display = 'flex';
    }
  }
});

// Clean up when page is unloaded
window.addEventListener('beforeunload', function() {
  const timerWidget = document.getElementById('reading-timer-widget');
  const showBtn = document.getElementById('show-timer-btn');
  
  if (timerWidget) {
    timerWidget.remove();
  }
  if (showBtn) {
    showBtn.remove();
  }
});
