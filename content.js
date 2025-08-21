// Content script for reading enhancement plugin

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Apply saved font if any
  chrome.storage.sync.get(['selectedFont', 'windowedReadingState'], function(result) {
    if (result.selectedFont && result.selectedFont !== 'default') {
      applyFont(result.selectedFont);
    }
    
    // Restore windowed reading state if active
    if (result.windowedReadingState && result.windowedReadingState.isActive) {
      enableWindowedReading(result.windowedReadingState.windowSize);
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
  } else if (request.action === 'enableWindowedReading') {
    enableWindowedReading(request.windowSize);
    sendResponse({success: true});
  } else if (request.action === 'disableWindowedReading') {
    disableWindowedReading();
    sendResponse({success: true});
  } else if (request.action === 'checkWindowedReadingState') {
    sendResponse({isActive: windowedReadingActive});
  } else if (request.action === 'checkTimerState') {
    const timerWidget = document.getElementById('reading-timer-widget');
    const isTimerRunning = timerWidget && timerWidget.style.display !== 'none';
    sendResponse({
      isRunning: isTimerRunning,
      startTime: isTimerRunning ? timerStartTime : null
    });
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
  // Store the start time for state checking
  timerStartTime = startTime;
  
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
    const elapsed = Date.now() - timerStartTime;
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
      
      const totalTime = Date.now() - timerStartTime;
      const timeString = formatTime(totalTime);
      
      // Clear stored start time
      timerStartTime = null;
      
      // Hide timer widget
      timerWidget.style.display = 'none';
      
      // Show celebration popup
      showCelebrationPopup(totalTime);
      
      // Also notify the popup that timer has been stopped
      chrome.runtime.sendMessage({
        action: 'timerStoppedFromWidget',
        totalTime: totalTime
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.log('Timer stop message error:', chrome.runtime.lastError);
        }
      });
      
      // Also update storage to ensure popup gets the state
      chrome.storage.sync.remove(['timerState']);
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
  
  // Clear stored start time
  timerStartTime = null;
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
    
    // Hide windowed reading elements
    if (shadowOverlay) {
      shadowOverlay.style.display = 'none';
    }
    if (focusWindow) {
      focusWindow.style.display = 'none';
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
    
    // Show windowed reading elements if active
    if (windowedReadingActive) {
      if (shadowOverlay) {
        shadowOverlay.style.display = 'block';
      }
      if (focusWindow) {
        focusWindow.style.display = 'block';
      }
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
  
  // Clean up windowed reading
  if (autoScrollInterval) {
    clearInterval(autoScrollInterval);
  }
  disableWindowedReading();
});

// Windowed Reading Functionality
let windowedReadingActive = false;
let focusWindow = null;
let shadowOverlay = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let isResizing = false;
let resizeHandle = null;
let autoScrollInterval = null;
let autoScrollSpeed = { x: 0, y: 0 };

// Timer state tracking
let timerStartTime = null;

function enableWindowedReading(windowSize) {
  if (windowedReadingActive) {
    // If already active, just update the size if different
    if (focusWindow) {
      const currentSize = {
        width: focusWindow.offsetWidth,
        height: focusWindow.offsetHeight
      };
      
      const sizes = {
        small: { width: 400, height: 300 },
        medium: { width: 600, height: 400 },
        large: { width: 800, height: 500 },
        custom: { width: 600, height: 400 }
      };
      
      const newSize = sizes[windowSize] || sizes.medium;
      
      if (currentSize.width !== newSize.width || currentSize.height !== newSize.height) {
        focusWindow.style.width = newSize.width + 'px';
        focusWindow.style.height = newSize.height + 'px';
        updateShadowOverlayCutout();
      }
    }
    return;
  }
  
  windowedReadingActive = true;
  
  // Create shadow overlay
  createShadowOverlay();
  
  // Create focus window
  createFocusWindow(windowSize);
  
  // Add event listeners for dragging and scrolling
  setupWindowedReadingEvents();
}

function disableWindowedReading() {
  if (!windowedReadingActive) {
    return;
  }
  
  windowedReadingActive = false;
  
  // Clear auto-scroll
  if (autoScrollInterval) {
    clearInterval(autoScrollInterval);
    autoScrollInterval = null;
  }
  autoScrollSpeed = { x: 0, y: 0 };
  
  // Remove shadow overlay
  if (shadowOverlay) {
    shadowOverlay.remove();
    shadowOverlay = null;
  }
  
  // Remove focus window
  if (focusWindow) {
    focusWindow.remove();
    focusWindow = null;
  }
  
  // Remove event listeners
  removeWindowedReadingEvents();
  
  // Notify popup that windowed reading was disabled
  chrome.runtime.sendMessage({
    action: 'windowedReadingDisabledFromWidget'
  }, function(response) {
    if (chrome.runtime.lastError) {
      console.log('Windowed reading disable message error:', chrome.runtime.lastError);
    }
  });
  
  // Also update storage to ensure popup gets the state
  chrome.storage.sync.remove(['windowedReadingState']);
}

function createShadowOverlay() {
  shadowOverlay = document.createElement('div');
  shadowOverlay.id = 'windowed-reading-overlay';
  shadowOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    z-index: 9998;
    pointer-events: none;
    transition: all 0.3s ease;
    backdrop-filter: blur(1px);
  `;
  
  document.body.appendChild(shadowOverlay);
  
  // Create a proper cutout effect for the focus window
  updateShadowOverlayCutout();
}

function updateShadowOverlayCutout() {
  if (!shadowOverlay || !focusWindow) return;
  
  const rect = focusWindow.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Create a clip-path that cuts out the focus window area
  // The path creates a rectangle with a hole in the middle
  const clipPath = `
    polygon(
      0% 0%,
      0% 100%,
      ${(rect.left / viewportWidth) * 100}% 100%,
      ${(rect.left / viewportWidth) * 100}% ${(rect.top / viewportHeight) * 100}%,
      ${((rect.left + rect.width) / viewportWidth) * 100}% ${(rect.top / viewportHeight) * 100}%,
      ${((rect.left + rect.width) / viewportWidth) * 100}% ${((rect.top + rect.height) / viewportHeight) * 100}%,
      ${(rect.left / viewportWidth) * 100}% ${((rect.top + rect.height) / viewportHeight) * 100}%,
      ${(rect.left / viewportWidth) * 100}% 100%,
      100% 100%,
      100% 0%
    )
  `;
  
  shadowOverlay.style.clipPath = clipPath;
}

function createFocusWindow(windowSize) {
  const sizes = {
    small: { width: 400, height: 300 },
    medium: { width: 600, height: 400 },
    large: { width: 800, height: 500 },
    custom: { width: 600, height: 400 }
  };
  
  const size = sizes[windowSize] || sizes.medium;
  
  focusWindow = document.createElement('div');
  focusWindow.id = 'windowed-reading-focus';
  focusWindow.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: ${size.width}px;
    height: ${size.height}px;
    background: transparent;
    border: 3px solid #4CAF50;
    border-radius: 8px;
    z-index: 9999;
    cursor: move;
    box-shadow: 
      0 0 20px rgba(76, 175, 80, 0.5),
      inset 0 0 20px rgba(76, 175, 80, 0.02);
    transition: all 0.3s ease;
    backdrop-filter: none;
  `;
  
  // Add resize handles
  focusWindow.innerHTML = `
    <div class="resize-handle resize-handle-nw" style="
      position: absolute;
      top: -5px;
      left: -5px;
      width: 10px;
      height: 10px;
      background: #4CAF50;
      border-radius: 50%;
      cursor: nw-resize;
      z-index: 10000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
    "></div>
    <div class="resize-handle resize-handle-ne" style="
      position: absolute;
      top: -5px;
      right: -5px;
      width: 10px;
      height: 10px;
      background: #4CAF50;
      border-radius: 50%;
      cursor: ne-resize;
      z-index: 10000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
    "></div>
    <div class="resize-handle resize-handle-sw" style="
      position: absolute;
      bottom: -5px;
      left: -5px;
      width: 10px;
      height: 10px;
      background: #4CAF50;
      border-radius: 50%;
      cursor: sw-resize;
      z-index: 10000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
    "></div>
    <div class="resize-handle resize-handle-se" style="
      position: absolute;
      bottom: -5px;
      right: -5px;
      width: 10px;
      height: 10px;
      background: #4CAF50;
      border-radius: 50%;
      cursor: se-resize;
      z-index: 10000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
    "></div>
    <div class="close-button" style="
      position: absolute;
      top: -15px;
      right: -15px;
      width: 30px;
      height: 30px;
      background: #f44336;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 16px;
      font-weight: bold;
      z-index: 10001;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
    ">×</div>
    <div class="help-text" style="
      position: absolute;
      bottom: -30px;
      left: 50%;
      transform: translateX(-50%);
      color: #4CAF50;
      font-size: 12px;
      font-family: Arial, sans-serif;
      text-align: center;
      white-space: nowrap;
      opacity: 0.8;
    ">Drag to move • Near edges to scroll • Resize handles • ESC to close • Ctrl+Arrows to move</div>
  `;
  
  document.body.appendChild(focusWindow);
  
  // Add hover effects for resize handles
  const resizeHandles = focusWindow.querySelectorAll('.resize-handle');
  resizeHandles.forEach(handle => {
    handle.addEventListener('mouseenter', function() {
      this.style.transform = 'scale(1.2)';
      this.style.background = '#66BB6A';
    });
    handle.addEventListener('mouseleave', function() {
      this.style.transform = 'scale(1)';
      this.style.background = '#4CAF50';
    });
  });
  
  // Add close button functionality
  const closeButton = focusWindow.querySelector('.close-button');
  closeButton.addEventListener('click', function(e) {
    e.stopPropagation();
    disableWindowedReading();
  });
  
  closeButton.addEventListener('mouseenter', function() {
    this.style.transform = 'scale(1.1)';
    this.style.background = '#EF5350';
  });
  
  closeButton.addEventListener('mouseleave', function() {
    this.style.transform = 'scale(1)';
    this.style.background = '#f44336';
  });
}

function setupWindowedReadingEvents() {
  if (!focusWindow) return;
  
  // Dragging functionality
  focusWindow.addEventListener('mousedown', startDragging);
  
  // Resize functionality
  const resizeHandles = focusWindow.querySelectorAll('.resize-handle');
  resizeHandles.forEach(handle => {
    handle.addEventListener('mousedown', startResizing);
  });
  
  // Scroll functionality
  document.addEventListener('scroll', updateFocusWindowPosition);
  window.addEventListener('resize', updateFocusWindowPosition);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleWindowedReadingKeyboard);
}

function removeWindowedReadingEvents() {
  document.removeEventListener('scroll', updateFocusWindowPosition);
  window.removeEventListener('resize', updateFocusWindowPosition);
  document.removeEventListener('keydown', handleWindowedReadingKeyboard);
}

function handleWindowedReadingKeyboard(e) {
  if (!windowedReadingActive || !focusWindow) return;
  
  // ESC key to disable windowed reading
  if (e.key === 'Escape') {
    disableWindowedReading();
    return;
  }
  
  // Arrow keys to move the focus window
  if (e.ctrlKey || e.metaKey) {
    const step = e.shiftKey ? 50 : 10;
    const rect = focusWindow.getBoundingClientRect();
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        const newY = Math.max(0, rect.top - step);
        focusWindow.style.top = newY + 'px';
        focusWindow.style.transform = 'none';
        updateShadowOverlayCutout();
        break;
      case 'ArrowDown':
        e.preventDefault();
        const maxY = window.innerHeight - focusWindow.offsetHeight;
        const newYDown = Math.min(maxY, rect.top + step);
        focusWindow.style.top = newYDown + 'px';
        focusWindow.style.transform = 'none';
        updateShadowOverlayCutout();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        const newX = Math.max(0, rect.left - step);
        focusWindow.style.left = newX + 'px';
        focusWindow.style.transform = 'none';
        updateShadowOverlayCutout();
        break;
      case 'ArrowRight':
        e.preventDefault();
        const maxX = window.innerWidth - focusWindow.offsetWidth;
        const newXRight = Math.min(maxX, rect.left + step);
        focusWindow.style.left = newXRight + 'px';
        focusWindow.style.transform = 'none';
        updateShadowOverlayCutout();
        break;
    }
  }
}

function startDragging(e) {
  if (e.target.classList.contains('resize-handle') || e.target.classList.contains('close-button')) {
    return;
  }
  
  isDragging = true;
  const rect = focusWindow.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;
  
  document.addEventListener('mousemove', handleDragging);
  document.addEventListener('mouseup', stopDragging);
  
  e.preventDefault();
  e.stopPropagation();
}

function handleDragging(e) {
  if (!isDragging || !focusWindow) return;
  
  const newX = e.clientX - dragOffset.x;
  const newY = e.clientY - dragOffset.y;
  
  // Constrain to viewport
  const maxX = window.innerWidth - focusWindow.offsetWidth;
  const maxY = window.innerHeight - focusWindow.offsetHeight;
  
  const constrainedX = Math.max(0, Math.min(newX, maxX));
  const constrainedY = Math.max(0, Math.min(newY, maxY));
  
  focusWindow.style.left = constrainedX + 'px';
  focusWindow.style.top = constrainedY + 'px';
  focusWindow.style.transform = 'none';
  
  // Update shadow overlay cutout
  updateShadowOverlayCutout();
  
  // Handle auto-scrolling when near edges
  handleAutoScroll(e);
  
  // Prevent default behavior only if not auto-scrolling
  if (autoScrollSpeed.x === 0 && autoScrollSpeed.y === 0) {
    e.preventDefault();
    e.stopPropagation();
  }
}

function handleAutoScroll(e) {
  const edgeThreshold = 50; // Distance from edge to start auto-scroll
  const scrollSpeed = 15; // Pixels per frame
  
  // Clear previous auto-scroll
  if (autoScrollInterval) {
    clearInterval(autoScrollInterval);
    autoScrollInterval = null;
  }
  
  autoScrollSpeed = { x: 0, y: 0 };
  
  // Check if mouse is near edges
  const mouseX = e.clientX;
  const mouseY = e.clientY;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Horizontal auto-scroll
  if (mouseX < edgeThreshold) {
    autoScrollSpeed.x = -scrollSpeed;
  } else if (mouseX > viewportWidth - edgeThreshold) {
    autoScrollSpeed.x = scrollSpeed;
  }
  
  // Vertical auto-scroll
  if (mouseY < edgeThreshold) {
    autoScrollSpeed.y = -scrollSpeed;
  } else if (mouseY > viewportHeight - edgeThreshold) {
    autoScrollSpeed.y = scrollSpeed;
  }
  
  // Start auto-scroll if needed
  if (autoScrollSpeed.x !== 0 || autoScrollSpeed.y !== 0) {
    autoScrollInterval = setInterval(() => {
      if (autoScrollSpeed.x !== 0) {
        window.scrollBy(autoScrollSpeed.x, 0);
      }
      if (autoScrollSpeed.y !== 0) {
        window.scrollBy(0, autoScrollSpeed.y);
      }
      
      // Update focus window position after scroll
      updateFocusWindowPosition();
      updateShadowOverlayCutout();
    }, 16); // ~60fps
  }
}

function stopDragging() {
  isDragging = false;
  document.removeEventListener('mousemove', handleDragging);
  document.removeEventListener('mouseup', stopDragging);
  
  // Clear auto-scroll
  if (autoScrollInterval) {
    clearInterval(autoScrollInterval);
    autoScrollInterval = null;
  }
  autoScrollSpeed = { x: 0, y: 0 };
}

function startResizing(e) {
  isResizing = true;
  resizeHandle = e.target;
  
  document.addEventListener('mousemove', handleResizing);
  document.addEventListener('mouseup', stopResizing);
  
  e.preventDefault();
  e.stopPropagation();
}

function handleResizing(e) {
  if (!isResizing || !focusWindow || !resizeHandle) return;
  
  const rect = focusWindow.getBoundingClientRect();
  const handleClass = resizeHandle.className;
  
  let newWidth = rect.width;
  let newHeight = rect.height;
  let newX = rect.left;
  let newY = rect.top;
  
  if (handleClass.includes('se')) {
    newWidth = e.clientX - rect.left;
    newHeight = e.clientY - rect.top;
  } else if (handleClass.includes('sw')) {
    newWidth = rect.right - e.clientX;
    newHeight = e.clientY - rect.top;
    newX = e.clientX;
  } else if (handleClass.includes('ne')) {
    newWidth = e.clientX - rect.left;
    newHeight = rect.bottom - e.clientY;
    newY = e.clientY;
  } else if (handleClass.includes('nw')) {
    newWidth = rect.right - e.clientX;
    newHeight = rect.bottom - e.clientY;
    newX = e.clientX;
    newY = e.clientY;
  }
  
  // Minimum size constraints
  const minSize = 200;
  newWidth = Math.max(minSize, newWidth);
  newHeight = Math.max(minSize, newHeight);
  
  // Update focus window
  focusWindow.style.width = newWidth + 'px';
  focusWindow.style.height = newHeight + 'px';
  focusWindow.style.left = newX + 'px';
  focusWindow.style.top = newY + 'px';
  focusWindow.style.transform = 'none';
  
  // Update shadow overlay cutout
  updateShadowOverlayCutout();
  
  // Prevent page scrolling
  e.preventDefault();
  e.stopPropagation();
}

function stopResizing() {
  isResizing = false;
  resizeHandle = null;
  document.removeEventListener('mousemove', handleResizing);
  document.removeEventListener('mouseup', stopResizing);
}

function updateFocusWindowPosition() {
  if (!focusWindow || isDragging || isResizing) return;
  
  // Keep focus window in viewport when page scrolls or resizes
  const rect = focusWindow.getBoundingClientRect();
  const maxX = window.innerWidth - focusWindow.offsetWidth;
  const maxY = window.innerHeight - focusWindow.offsetHeight;
  
  if (rect.left > maxX) {
    focusWindow.style.left = maxX + 'px';
  }
  if (rect.top > maxY) {
    focusWindow.style.top = maxY + 'px';
  }
  if (rect.left < 0) {
    focusWindow.style.left = '0px';
  }
  if (rect.top < 0) {
    focusWindow.style.top = '0px';
  }
}
