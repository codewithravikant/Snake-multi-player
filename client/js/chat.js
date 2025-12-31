// Chat system (bonus feature - feature flag enabled)
let chatEnabled = false;
let chatVisible = false;
let chatInitialized = false; // Prevent multiple initializations

function initChat() {
  // Prevent multiple initializations
  if (chatInitialized) {
    return;
  }
  
  // Check if chat is enabled via feature flags
  // Try to get featureFlags from window (set by client.js)
  const flags = typeof window !== 'undefined' && window.featureFlags ? window.featureFlags : 
                typeof featureFlags !== 'undefined' ? featureFlags : {};
  
  if (flags.chat) {
    chatEnabled = true;
    chatInitialized = true;
    if (typeof window !== 'undefined' && window.devLog) {
      window.devLog.log('Chat initialized and enabled');
    }
    createChatUI();
    setupChatListeners();
  } else {
    if (typeof window !== 'undefined' && window.devLog) {
      window.devLog.log('Chat not enabled (feature flag disabled)');
    }
  }
}

function createChatUI() {
  // Check if chat container already exists - prevent duplicates
  let chatContainer = document.getElementById('chatContainer');
  if (chatContainer) {
    return; // Don't create duplicate
  }
  
  // Create chat container
  chatContainer = document.createElement('div');
  chatContainer.id = 'chatContainer';
  chatContainer.className = 'chat-container';
  chatContainer.innerHTML = `
    <div class="chat-header">
      <span>Chat</span>
      <button id="chatToggle" class="chat-toggle">−</button>
    </div>
    <div class="chat-messages" id="chatMessages"></div>
    <div class="chat-input-container">
      <input type="text" id="chatInput" placeholder="Type a message..." maxlength="100">
      <button id="chatSend" class="chat-send-btn">Send</button>
    </div>
  `;

  document.body.appendChild(chatContainer);

  // Toggle chat visibility
  document.getElementById('chatToggle').addEventListener('click', () => {
    toggleChat();
  });

  // Send message on Enter key
  const chatInput = document.getElementById('chatInput');
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage();
    }
  });

  // Send button - use event delegation to ensure it works
  const chatSendBtn = document.getElementById('chatSend');
  if (chatSendBtn) {
    chatSendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      sendChatMessage();
    });
    // Also ensure pointer events are enabled
    chatSendBtn.style.pointerEvents = 'auto';
    chatSendBtn.style.cursor = 'pointer';
  }
}

function toggleChat() {
  const chatContainer = document.getElementById('chatContainer');
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const toggleBtn = document.getElementById('chatToggle');

  chatVisible = !chatVisible;

  if (chatVisible) {
    chatMessages.style.display = 'block';
    chatInput.style.display = 'block';
    toggleBtn.textContent = '−';
  } else {
    chatMessages.style.display = 'none';
    chatInput.style.display = 'none';
    toggleBtn.textContent = '+';
  }
}

function setupChatListeners() {
  // Try to get socket from window (set by client.js)
  const socketToUse = (typeof window !== 'undefined' && window.socket) ? window.socket : socket;
  
  if (!socketToUse) {
    if (typeof window !== 'undefined' && window.devLog) {
      window.devLog.warn('Chat: Socket not available, retrying...');
    }
    // Retry after a short delay
    setTimeout(setupChatListeners, 500);
    return;
  }

  socketToUse.on('chatMessage', (data) => {
    addChatMessage(data.playerName, data.message, data.timestamp);
  });
  
  if (typeof window !== 'undefined' && window.devLog) {
    window.devLog.log('Chat listeners set up successfully');
  }
}

function sendChatMessage() {
  if (!chatEnabled) {
    if (typeof window !== 'undefined' && window.devLog) {
      window.devLog.warn('Chat: Chat is not enabled');
    }
    return;
  }
  
  // Try to get socket from window (set by client.js)
  const socketToUse = (typeof window !== 'undefined' && window.socket) ? window.socket : socket;
  
  if (!socketToUse) {
    if (typeof window !== 'undefined' && window.devLog) {
      window.devLog.warn('Chat: Socket not available');
    }
    return;
  }
  
  if (!socketToUse.connected) {
    if (typeof window !== 'undefined' && window.devLog) {
      window.devLog.warn('Chat: Socket not connected, connection state:', socketToUse.connected);
    }
    return;
  }

  const chatInput = document.getElementById('chatInput');
  if (!chatInput) {
    if (typeof window !== 'undefined' && window.devLog) {
      window.devLog.warn('Chat: Chat input element not found');
    }
    return;
  }
  
  const message = chatInput.value.trim();

  if (!message) {
    if (typeof window !== 'undefined' && window.devLog) {
      window.devLog.warn('Chat: Empty message, not sending');
    }
    return;
  }

  const roomCode = new URLSearchParams(window.location.search).get('room');
  if (!roomCode) {
    if (typeof window !== 'undefined' && window.devLog) {
      window.devLog.warn('Chat: No room code found in URL');
    }
    return;
  }

  socketToUse.emit('chatMessage', {
    roomCode: roomCode,
    message: message
  });

  chatInput.value = '';
  
  if (typeof window !== 'undefined' && window.devLog) {
    window.devLog.log('Chat: Message emitted successfully');
  }
}

function addChatMessage(playerName, message, timestamp) {
  if (!chatEnabled) return;

  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message';

  const time = new Date(timestamp);
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  messageDiv.innerHTML = `
    <span class="chat-player-name">${playerName}:</span>
    <span class="chat-message-text">${escapeHtml(message)}</span>
    <span class="chat-time">${timeStr}</span>
  `;

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Limit message history (keep last 50 messages)
  while (chatMessages.children.length > 50) {
    chatMessages.removeChild(chatMessages.firstChild);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize chat when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Wait for feature flags to be loaded
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.devLog) {
        window.devLog.log('Chat: Initializing chat system...');
        window.devLog.log('Chat: featureFlags available:', typeof window.featureFlags !== 'undefined');
        window.devLog.log('Chat: featureFlags.chat:', window.featureFlags?.chat);
      }
      initChat();
    }, 100);
  });
  
  // Also try to initialize after a longer delay in case feature flags load late
  setTimeout(() => {
    if (typeof window !== 'undefined' && window.devLog) {
      window.devLog.log('Chat: Retry initialization after delay');
    }
    initChat();
  }, 1000);
}

