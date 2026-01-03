// Speech Recognition setup
let recognition = null;
let isListening = false;
let speechTimeout = null;
let accumulatedTranscript = '';
const SPEECH_DELAY_MS = 3000; // Wait 3 seconds of silence before sending

// DA IMS Token cache
let cachedDAToken = null;
// Admin Auth Token cache
let cachedAdminToken = null;

/**
 * Fetches and parses the da-config.txt file to get DA_IMS_TOKEN
 * @returns {Promise<string|null>} The DA IMS token or null if not found
 */
async function getDATokenFromEnv() {
  // Return cached token if available
  if (cachedDAToken) {
    return cachedDAToken;
  }

  try {
    const response = await fetch('/da-config.txt');
    if (!response.ok) {
      console.warn('Could not fetch da-config.txt file:', response.status);
      return null;
    }

    const envContent = await response.text();
    
    // Parse config file to find DA_IMS_TOKEN
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Skip comments and empty lines
      if (trimmedLine.startsWith('#') || trimmedLine === '') continue;
      
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key.trim() === 'DA_IMS_TOKEN') {
        cachedDAToken = valueParts.join('=').trim();
        // Remove quotes if present
        if ((cachedDAToken.startsWith('"') && cachedDAToken.endsWith('"')) ||
            (cachedDAToken.startsWith("'") && cachedDAToken.endsWith("'"))) {
          cachedDAToken = cachedDAToken.slice(1, -1);
        }
        console.log('✅ DA IMS Token loaded from da-config.txt');
        return cachedDAToken;
      }
    }

    console.warn('DA_IMS_TOKEN not found in da-config.txt file');
    return null;
  } catch (error) {
    console.error('Error reading da-config.txt file:', error);
    return null;
  }
}

/**
 * Fetches and parses the da-config.txt file to get ADMIN_AUTH_TOKEN
 * @returns {Promise<string|null>} The Admin Auth token or null if not found
 */
async function getAdminAuthTokenFromEnv() {
  // Return cached token if available
  if (cachedAdminToken) {
    return cachedAdminToken;
  }

  try {
    const response = await fetch('/da-config.txt');
    if (!response.ok) {
      console.warn('Could not fetch da-config.txt file:', response.status);
      return null;
    }

    const envContent = await response.text();
    
    // Parse config file to find ADMIN_AUTH_TOKEN
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Skip comments and empty lines
      if (trimmedLine.startsWith('#') || trimmedLine === '') continue;
      
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key.trim() === 'ADMIN_AUTH_TOKEN') {
        cachedAdminToken = valueParts.join('=').trim();
        // Remove quotes if present
        if ((cachedAdminToken.startsWith('"') && cachedAdminToken.endsWith('"')) ||
            (cachedAdminToken.startsWith("'") && cachedAdminToken.endsWith("'"))) {
          cachedAdminToken = cachedAdminToken.slice(1, -1);
        }
        console.log('✅ Admin Auth Token loaded from da-config.txt');
        return cachedAdminToken;
      }
    }

    console.warn('ADMIN_AUTH_TOKEN not found in da-config.txt file');
    return null;
  } catch (error) {
    console.error('Error reading da-config.txt file:', error);
    return null;
  }
}

/**
 * Clears the cached DA token (useful if token needs refresh)
 */
function clearDATokenCache() {
  cachedDAToken = null;
}

/**
 * Clears the cached Admin Auth token (useful if token needs refresh)
 */
function clearAdminAuthTokenCache() {
  cachedAdminToken = null;
}

function initSpeechRecognition() {
  // Check for browser support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.warn('Speech Recognition not supported in this browser');
    return null;
  }
  
  recognition = new SpeechRecognition();
  recognition.continuous = true; // Keep listening until manually stopped or timeout
  recognition.interimResults = true; // Show results as user speaks
  recognition.lang = 'en-US';
  
  return recognition;
}

export default function decorate(block) {
  // Create the fancy sidebar chatbot HTML structure
  const chatbotHTML = `
    <div class="sidebar-chat" id="sidebarChat">
      <div class="header">
        <div class="header-content">
          <img class="adobe-logo" src="../../adobe-logo.png" alt="Adobe Logo" width="20" height="20">
          ChatBot
        </div>
        <span class="close-btn">✖</span>
      </div>
      <div class="messages">
        <div class="bot-msg">Hey ! I'm your assistant.</div>
      </div>
      <div class="quick-actions">
        <button class="quick-btn update-index-btn">📋 Update Index</button>
        <button class="quick-btn reset-btn">🔄 Reset</button>
      </div>
      <div class="input-container">
        <input type="text" placeholder="Type or speak..." class="chat-input">
        <button class="mic-btn" title="Click to speak">
          <svg class="mic-icon" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="#aaaaaa" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path fill="#aaaaaa" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
          <div class="mic-pulse"></div>
        </button>
      </div>
    </div>
    <button class="open-btn">Let me know, Mitch !</button>
  `;
  
  // Append the HTML to the block
  block.innerHTML = chatbotHTML;
  
  // Add event listeners instead of inline handlers
  const openBtn = block.querySelector('.open-btn');
  const closeBtn = block.querySelector('.close-btn');
  const chatInput = block.querySelector('.chat-input');
  const updateIndexBtn = block.querySelector('.update-index-btn');
  const resetBtn = block.querySelector('.reset-btn');
  const micBtn = block.querySelector('.mic-btn');
  
  openBtn.addEventListener('click', openSidebar);
  closeBtn.addEventListener('click', closeSidebar);
  chatInput.addEventListener('keypress', sidebarSend);
  updateIndexBtn.addEventListener('click', () => autoSendMessage('update index'));
  resetBtn.addEventListener('click', () => autoSendMessage('reset'));
  
  // Initialize speech recognition
  initSpeechRecognition();
  
  // Add mic button click handler
  micBtn.addEventListener('click', () => toggleSpeechRecognition(chatInput, micBtn));
}

function openSidebar() {
  document.getElementById('sidebarChat').style.right = '0';
}

function closeSidebar() {
  document.getElementById('sidebarChat').style.right = '-350px';
  // Stop speech recognition if active when closing sidebar
  if (isListening && recognition) {
    recognition.stop();
    isListening = false;
  }
}

function toggleSpeechRecognition(inputElement, micButton) {
  if (!recognition) {
    // Browser doesn't support speech recognition
    showSpeechError(inputElement, 'Speech recognition is not supported in your browser. Please use Chrome or Edge.');
    return;
  }
  
  if (isListening) {
    // Stop listening and send immediately if there's content
    clearTimeout(speechTimeout);
    recognition.stop();
    isListening = false;
    micButton.classList.remove('listening');
    inputElement.placeholder = 'Type or speak...';
    
    // Send accumulated transcript if any
    if (accumulatedTranscript.trim()) {
      sendVoiceMessage(accumulatedTranscript.trim(), inputElement);
    }
    accumulatedTranscript = '';
  } else {
    // Start listening
    isListening = true;
    accumulatedTranscript = '';
    micButton.classList.add('listening');
    inputElement.placeholder = 'Listening... (3s silence to send)';
    inputElement.value = '';
    
    // Function to reset the 5-second timer
    const resetSpeechTimeout = () => {
      clearTimeout(speechTimeout);
      speechTimeout = setTimeout(() => {
        // 5 seconds of silence - stop and send
        if (isListening && accumulatedTranscript.trim()) {
          recognition.stop();
          isListening = false;
          micButton.classList.remove('listening');
          inputElement.placeholder = 'Type or speak...';
          sendVoiceMessage(accumulatedTranscript.trim(), inputElement);
          accumulatedTranscript = '';
        }
      }, SPEECH_DELAY_MS);
    };
    
    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Accumulate final transcripts
      if (finalTranscript) {
        accumulatedTranscript += finalTranscript + ' ';
      }
      
      // Show current state in the input field
      inputElement.value = (accumulatedTranscript + interimTranscript).trim();
      
      // Reset the 5-second timer on any speech activity
      resetSpeechTimeout();
    };
    
    // Start the initial timeout
    resetSpeechTimeout();
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      clearTimeout(speechTimeout);
      
      // Don't treat 'no-speech' as an error when we have accumulated text
      if (event.error === 'no-speech' && accumulatedTranscript.trim()) {
        // Just restart recognition to keep listening
        return;
      }
      
      isListening = false;
      micButton.classList.remove('listening');
      inputElement.placeholder = 'Type or speak...';
      
      let errorMessage = 'Speech recognition error. Please try again.';
      if (event.error === 'no-speech') {
        errorMessage = 'No speech detected. Please try again.';
      } else if (event.error === 'audio-capture') {
        errorMessage = 'No microphone found. Please check your microphone.';
      } else if (event.error === 'not-allowed') {
        errorMessage = 'Microphone access denied. Please allow microphone access.';
      }
      
      accumulatedTranscript = '';
      showSpeechError(inputElement, errorMessage);
    };
    
    recognition.onend = () => {
      // If we're still supposed to be listening, restart recognition
      // (continuous recognition can end unexpectedly)
      if (isListening) {
        try {
          recognition.start();
        } catch (e) {
          // Recognition already started or other error - just reset
          isListening = false;
          micButton.classList.remove('listening');
          inputElement.placeholder = 'Type or speak...';
          clearTimeout(speechTimeout);
        }
      }
    };
    
    try {
      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      isListening = false;
      micButton.classList.remove('listening');
      showSpeechError(inputElement, 'Failed to start speech recognition. Please try again.');
    }
  }
}

function showSpeechError(inputElement, message) {
  const msgContainer = document.querySelector('.sidebar-chat .messages');
  const errorMsg = document.createElement('div');
  errorMsg.className = 'bot-msg error';
  errorMsg.innerHTML = `<span class="error-text">🎤 ${message}</span>`;
  msgContainer.appendChild(errorMsg);
  msgContainer.scrollTop = msgContainer.scrollHeight;
  inputElement.placeholder = 'Type or speak...';
}

function sendVoiceMessage(userInput, inputElement) {
  const msgContainer = document.querySelector('.sidebar-chat .messages');
  
  // Add user message with voice indicator
  const userMsg = document.createElement('div');
  userMsg.className = 'user-msg';
  userMsg.innerHTML = `<span class="voice-indicator">🎤</span> ${userInput}`;
  msgContainer.appendChild(userMsg);
  
  // Clear input and scroll
  inputElement.value = '';
  msgContainer.scrollTop = msgContainer.scrollHeight;
  
  // Process the message
  processMessage(userInput, msgContainer);
}

async function autoSendMessage(message) {
  const msgContainer = document.querySelector('.sidebar-chat .messages');
  
  // Add user message to chat
  const userMsg = document.createElement('div');
  userMsg.className = 'user-msg';
  userMsg.textContent = message;
  msgContainer.appendChild(userMsg);
  
  // Scroll to bottom
  msgContainer.scrollTop = msgContainer.scrollHeight;
  
  // Process the message (same logic as manual send)
  await processMessage(message, msgContainer);
}

async function processMessage(userInput, msgContainer) {
  // Check if user wants to update index
  if (userInput.toLowerCase() === 'update index') {
    // Add bot response for index update
    const botMsg = document.createElement('div');
    botMsg.className = 'bot-msg loading';
    botMsg.innerHTML = `
      <div class="loading-indicator">
        <span class="spinner"></span>
        Updating JSON index...
      </div>
    `;
    msgContainer.appendChild(botMsg);
    msgContainer.scrollTop = msgContainer.scrollHeight;
    
    try {
      // Trigger only the JSON preview flow
      await triggerIndexUpdateFlow(botMsg);
    } catch (error) {
      console.error('Error updating index:', error);
      botMsg.className = 'bot-msg error';
      botMsg.textContent = 'Sorry, there was an error updating the index. Please try again.';
    }
  } else if (userInput.toLowerCase() === 'reset') {
    // Add bot response for reset
    const botMsg = document.createElement('div');
    botMsg.className = 'bot-msg loading';
    botMsg.innerHTML = `
      <div class="loading-indicator">
        <span class="spinner"></span>
        Resetting Excel sheet and JSON index...
      </div>
    `;
    msgContainer.appendChild(botMsg);
    msgContainer.scrollTop = msgContainer.scrollHeight;
    
    try {
      // Trigger the Excel reset flow
      await triggerResetFlow(botMsg);
    } catch (error) {
      console.error('Error resetting data:', error);
      botMsg.className = 'bot-msg error';
      botMsg.textContent = 'Sorry, there was an error resetting the data. Please try again.';
    }
  } else {
    // Check if prompt contains hero/banner keywords (matching PA flow logic)
    const lowerPrompt = userInput.toLowerCase();
    const isHeroPrompt = lowerPrompt.includes('hero') || lowerPrompt.includes('banner');
    
    if (isHeroPrompt) {
      // Hero prompt: Generate both image and text
      const botMsg = document.createElement('div');
      botMsg.className = 'bot-msg loading';
      botMsg.innerHTML = `
        <div class="loading-indicator">
          <span class="spinner"></span>
          Generating AI image and detailed information for hero/banner content...
        </div>
        <div class="dual-progress">
          <div class="progress-item" id="image-progress">
            <span class="progress-icon">🎨</span>
            <span class="progress-text">Generating image...</span>
          </div>
          <div class="progress-item" id="text-progress">
            <span class="progress-icon">📝</span>
            <span class="progress-text">Generating detailed info...</span>
          </div>
        </div>
      `;
      msgContainer.appendChild(botMsg);
      msgContainer.scrollTop = msgContainer.scrollHeight;
      
      try {
        // Call dual generation flow for hero/banner prompts
        await triggerDualGenerationFlow(userInput, botMsg);
      } catch (error) {
        console.error('Error calling dual generation:', error);
        botMsg.className = 'bot-msg error';
        botMsg.textContent = 'Sorry, there was an error processing your request. Please try again.';
      }
    } else {
      // Non-hero/banner prompt: Generate image only
      const botMsg = document.createElement('div');
      botMsg.className = 'bot-msg loading';
      botMsg.innerHTML = `
        <div class="loading-indicator">
          <span class="spinner"></span>
          Generating AI image...
        </div>
      `;
      msgContainer.appendChild(botMsg);
      msgContainer.scrollTop = msgContainer.scrollHeight;
      
      try {
        // Call original image-only flow
        await triggerPowerAutomateFlow(userInput, botMsg);
      } catch (error) {
        console.error('Error calling Power Automate:', error);
        botMsg.className = 'bot-msg error';
        botMsg.textContent = 'Sorry, there was an error processing your request. Please try again.';
      }
    }
  }
  
  msgContainer.scrollTop = msgContainer.scrollHeight;
}

async function sidebarSend(e) {
  if (e.key === 'Enter' && e.target.value.trim() !== '') {
    const msgContainer = document.querySelector('.sidebar-chat .messages');
    const userInput = e.target.value.trim();
    
    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'user-msg';
    userMsg.textContent = userInput;
    msgContainer.appendChild(userMsg);
    
    // Clear input and scroll
    e.target.value = '';
    msgContainer.scrollTop = msgContainer.scrollHeight;
    
    // Process the message using the shared function
    await processMessage(userInput, msgContainer);
  }
}

// New function to handle dual generation (image + text)
async function triggerDualGenerationFlow(prompt, botMessageElement) {
  // Direct webhook URL from your Power Automate HTTP trigger
  const powerAutomateUrl = 'https://defaultfa7b1b5a7b34438794aed2c178dece.e1.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/6adb5e389c854ed3ab1ffd03a6243ff5/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=iWUv8r2CjIGlucoqXTiEXwHuE6zONcLvvnfNVU0nOGw';
  
  // Get DA IMS Token from da-config.txt file
  const daImsToken = await getDATokenFromEnv();
  
  if (!daImsToken || daImsToken === 'your_token_here') {
    botMessageElement.className = 'bot-msg error';
    botMessageElement.innerHTML = `
      <div class="error-message">
        ⚠️ <strong>DA IMS Token Required</strong><br>
        <span class="error-text">Please update da-config.txt with your DA IMS Token.</span><br>
        <span class="retry-text">
          1. Login to <a href="https://da.live" target="_blank">da.live</a><br>
          2. Open browser console and run: <code>copy(adobeIMS.getAccessToken().token)</code><br>
          3. Update DA_IMS_TOKEN in da-config.txt
        </span>
      </div>
    `;
    return;
  }
  
  // Get Admin Auth Token from da-config.txt file
  const adminAuthToken = await getAdminAuthTokenFromEnv();
  
  if (!adminAuthToken || adminAuthToken === 'your_admin_token_here') {
    botMessageElement.className = 'bot-msg error';
    botMessageElement.innerHTML = `
      <div class="error-message">
        ⚠️ <strong>Admin Auth Token Required</strong><br>
        <span class="error-text">Please update da-config.txt with your Admin Auth Token.</span><br>
        <span class="retry-text">
          1. Login to <a href="https://admin.hlx.page" target="_blank">admin.hlx.page</a><br>
          2. Get your auth token from browser<br>
          3. Update ADMIN_AUTH_TOKEN in da-config.txt
        </span>
      </div>
    `;
    return;
  }
  
  // Get current page path to determine target Word document
  const currentPath = window.location.pathname;
  const currentHost = window.location.host;
  
  const requestBody = {
    prompt: prompt,
    timestamp: new Date().toISOString(),
    source: 'web-chatbot',
    currentPath: currentPath,
    currentHost: currentHost,
    fullUrl: window.location.href,
    // DA IMS Token for Document Authoring API
    daImsToken: daImsToken,
    // Admin Auth Token for x-auth-token header
    adminAuthToken: adminAuthToken,
    // New flag to indicate dual generation is requested
    generateText: true,
    generateImage: true,
    textGenerationType: 'hero-content', // Request 1-2 paragraphs for hero block
    isHeroPrompt: true // Flag to indicate this is for hero content
  };
  
  // Update progress indicators
  const updateProgress = (type, status, text) => {
    const progressElement = botMessageElement.querySelector(`#${type}-progress .progress-text`);
    const iconElement = botMessageElement.querySelector(`#${type}-progress .progress-icon`);
    if (progressElement) {
      progressElement.textContent = text;
      if (status === 'completed') {
        iconElement.textContent = '✅';
        progressElement.style.color = '#4CAF50';
      } else if (status === 'error') {
        iconElement.textContent = '❌';
        progressElement.style.color = '#f44336';
      }
    }
  };
  
  try {
    // Start both operations
    updateProgress('image', 'processing', 'Generating image...');
    updateProgress('text', 'processing', 'Generating detailed info...');
    
    const response = await fetch(powerAutomateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (response.ok) {
      const result = await response.json();
      
      // Update bot message with success
      botMessageElement.className = 'bot-msg success';
      
      // Extract data from result - handle both nested and flat structures
      const imageUrl = result.imageUrl || result.body?.imageUrl || '';
      const targetFolder = result.targetFolder || result.body?.targetFolder || '';
      const sharePointFile = result.sharePointFile || result.body?.sharePointFile || '';
      const edsUrl = result.edsUrl || result.body?.edsUrl || '';
      const generatedText = result.generatedText || result.body?.generatedText || '';
      const textExcelFile = result.textExcelFile || result.body?.textExcelFile || '';
      
      // Create full EDS URL if it's a relative path
      const fullEdsUrl = edsUrl && edsUrl.startsWith('/') ? `https://main--mitch-lab--meejain.aem.page${edsUrl}` : edsUrl;
      
      // Update progress indicators
      updateProgress('image', 'completed', 'Image generated!');
      updateProgress('text', 'completed', 'Info generated!');
      
      botMessageElement.innerHTML = `
        <div class="success-message">
          ✅ <strong>AI Content Generated Successfully!</strong><br>
          <span class="prompt-text">Prompt: "${prompt}"</span><br><br>
          
          <div class="generation-results">
            <div class="result-section">
              <h4>🎨 Generated Image:</h4>
              ${imageUrl ? `<img src="${imageUrl}" alt="Generated Image" class="generated-image"><br>` : '<span class="error-text">Image generation failed</span><br>'}
              ${targetFolder ? `<span class="status-text">Saved to: <strong>${targetFolder}</strong></span><br>` : ''}
              ${imageUrl ? `<span class="status-text"><a href="${imageUrl}" target="_blank">${imageUrl}</a></span><br>` : ''}
            </div>
            
            <div class="result-section">
              <h4>📝 Generated Information:</h4>
              <div class="generated-text">${generatedText || 'Text generation failed'}</div>
              ${textExcelFile ? `<span class="status-text">Info saved to: <strong>${textExcelFile}</strong></span><br>` : ''}
            </div>
          </div>
          
          ${fullEdsUrl ? `🌐 <strong>EDS URL:</strong> <a href="${fullEdsUrl}" target="_blank">${fullEdsUrl}</a><br><br>` : ''}
          
          <div class="indexing-status" id="indexing-${Date.now()}">
            <span>📋 <strong>Content saved to Excel</strong> - Type "update index" to refresh the <a href="https://main--mitch-lab--meejain.aem.page/ai-image-generation-log.json" target="_blank" style="color: #2196F3; text-decoration: underline;">JSON API</a></span>
          </div>
        </div>
      `;
      
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Dual generation request failed:', error);
    updateProgress('image', 'error', 'Image generation failed');
    updateProgress('text', 'error', 'Text generation failed');
    
    botMessageElement.className = 'bot-msg error';
    botMessageElement.innerHTML = `
      <div class="error-message">
        ❌ <strong>Request Failed</strong><br>
        <span class="error-text">Unable to process content generation. Error: ${error.message}</span><br>
        <span class="retry-text">Please try again or check your connection.</span>
      </div>
    `;
  }
}

// Keep the original function for backward compatibility
async function triggerPowerAutomateFlow(prompt, botMessageElement) {
  // Direct webhook URL from your Power Automate HTTP trigger
  // Updated with the new trigger URL (old URL expires November 30, 2025)
  const powerAutomateUrl = 'https://defaultfa7b1b5a7b34438794aed2c178dece.e1.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/6adb5e389c854ed3ab1ffd03a6243ff5/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=iWUv8r2CjIGlucoqXTiEXwHuE6zONcLvvnfNVU0nOGw';
  
  // Get DA IMS Token from da-config.txt file
  const daImsToken = await getDATokenFromEnv();
  
  if (!daImsToken || daImsToken === 'your_token_here') {
    botMessageElement.className = 'bot-msg error';
    botMessageElement.innerHTML = `
      <div class="error-message">
        ⚠️ <strong>DA IMS Token Required</strong><br>
        <span class="error-text">Please update da-config.txt with your DA IMS Token.</span><br>
        <span class="retry-text">
          1. Login to <a href="https://da.live" target="_blank">da.live</a><br>
          2. Open browser console and run: <code>copy(adobeIMS.getAccessToken().token)</code><br>
          3. Update DA_IMS_TOKEN in da-config.txt
        </span>
      </div>
    `;
    return;
  }
  
  // Get Admin Auth Token from da-config.txt file
  const adminAuthToken = await getAdminAuthTokenFromEnv();
  
  if (!adminAuthToken || adminAuthToken === 'your_admin_token_here') {
    botMessageElement.className = 'bot-msg error';
    botMessageElement.innerHTML = `
      <div class="error-message">
        ⚠️ <strong>Admin Auth Token Required</strong><br>
        <span class="error-text">Please update da-config.txt with your Admin Auth Token.</span><br>
        <span class="retry-text">
          1. Login to <a href="https://admin.hlx.page" target="_blank">admin.hlx.page</a><br>
          2. Get your auth token from browser<br>
          3. Update ADMIN_AUTH_TOKEN in da-config.txt
        </span>
      </div>
    `;
    return;
  }
  
  // Get current page path to determine target Word document
  const currentPath = window.location.pathname;
  const currentHost = window.location.host;
  
  const requestBody = {
    prompt: prompt,
    timestamp: new Date().toISOString(),
    source: 'web-chatbot',
    currentPath: currentPath,
    currentHost: currentHost,
    fullUrl: window.location.href,
    // DA IMS Token for Document Authoring API
    daImsToken: daImsToken,
    // Admin Auth Token for x-auth-token header
    adminAuthToken: adminAuthToken
  };
  
  try {
    const response = await fetch(powerAutomateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (response.ok) {
      const result = await response.json();
      
      // Update bot message with success
      botMessageElement.className = 'bot-msg success';
      
      // Extract data from result - handle both nested and flat structures
      const imageUrl = result.imageUrl || result.body?.imageUrl || '';
      const targetFolder = result.targetFolder || result.body?.targetFolder || '';
      const sharePointFile = result.sharePointFile || result.body?.sharePointFile || '';
      const edsUrl = result.edsUrl || result.body?.edsUrl || '';
      const edsMessage = result.edsMessage || result.body?.edsMessage || '';
      
      // Create full EDS URL if it's a relative path
      const fullEdsUrl = edsUrl && edsUrl.startsWith('/') ? `https://main--mitch-lab--meejain.aem.page${edsUrl}` : edsUrl;
      
      botMessageElement.innerHTML = `
        <div class="success-message">
          ✅ <strong>AI Image Generated Successfully!</strong><br>
          <span class="prompt-text">Prompt: "${prompt}"</span><br>
          <span class="status-text">Your image has been generated and processed by Power Automate!</span><br>
          ${targetFolder ? `<span class="status-text">Saved to folder: <strong>${targetFolder}</strong></span><br>` : ''}
          ${imageUrl ? `<span class="status-text">EDS URL: <a href="${imageUrl}" target="_blank">${imageUrl}</a></span><br><br>` : ''}
          ${imageUrl ? `<img src="${imageUrl}" alt="Generated Image" class="generated-image"><br><br>` : ''}
          <div class="indexing-status" id="indexing-${Date.now()}">
            <span>📋 <strong>Image saved to Excel</strong> - Type "update index" to refresh the <a href="https://main--mitch-lab--meejain.aem.page/ai-image-generation-log.json" target="_blank" style="color: #2196F3; text-decoration: underline;">JSON API</a></span>
          </div>
        </div>
      `;
      
      // Manual indexing - users can type "update index" when needed
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Power Automate request failed:', error);
    botMessageElement.className = 'bot-msg error';
    botMessageElement.innerHTML = `
      <div class="error-message">
        ❌ <strong>Request Failed</strong><br>
        <span class="error-text">Unable to process image generation. Error: ${error.message}</span><br>
        <span class="retry-text">Please try again or check your connection.</span>
      </div>
    `;
  }
}

// Function to trigger JSON preview flow after main flow completes
async function triggerJSONPreviewFlow(prompt, targetFolder, sharePointFile, botMessageElement) {
  // URL for the Power Automate flow for JSON Preview/Index Update
  const jsonPreviewFlowUrl = 'https://defaultfa7b1b5a7b34438794aed2c178dece.e1.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/355133b004df498b8e7f4e763911d203/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=iDZSvUf5ydsLvckCSJ-4Hh1uN3sFRRcymBoRoBADS_o';
  
  // Get Admin Auth Token from da-config.txt file
  const adminAuthToken = await getAdminAuthTokenFromEnv();
  
  const requestBody = {
    trigger: 'json-preview',
    originalPrompt: prompt,
    targetFolder: targetFolder,
    sharePointFile: sharePointFile,
    timestamp: new Date().toISOString(),
    adminAuthToken: adminAuthToken || ''
  };
  
  try {
    console.log('🚀 Triggering JSON preview flow...');
    console.log('📋 Request body:', requestBody);
    console.log('🔗 Flow URL:', jsonPreviewFlowUrl);
    
    const response = await fetch(jsonPreviewFlowUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers);
    
    if (response.ok) {
      const result = await response.text();
      console.log('✅ JSON preview flow triggered successfully');
      console.log('📄 Response body:', result);
      
      // Update status to show indexing completed
      setTimeout(() => {
        const indexingDiv = botMessageElement.querySelector('.indexing-status');
        if (indexingDiv && !indexingDiv.classList.contains('completed')) {
          indexingDiv.innerHTML = 
            '<span>✅ <strong>Indexing completed!</strong> JSON API is updated - <a href="https://main--mitch-lab--meejain.aem.page/ai-image-generation-log.json" target="_blank" style="color: #4CAF50; text-decoration: underline;">Check JSON API</a></span>';
          indexingDiv.classList.add('completed');
        }
      }, 5000); // Update message after 5 seconds
      
      // Show immediate feedback that automatic indexing started
      setTimeout(() => {
        const indexingDiv = botMessageElement.querySelector('.indexing-status');
        if (indexingDiv) {
          indexingDiv.querySelector('span').innerHTML = 
            '🔄 <strong>Auto-indexing triggered...</strong> JSON API update in progress';
        }
      }, 2000); // Show after 2 seconds
    } else {
      const errorText = await response.text();
      console.warn('❌ JSON preview flow trigger failed:', response.status);
      console.warn('❌ Error details:', errorText);
      
      // Update status to show indexing failed
      updateIndexingStatus(botMessageElement, 'failed');
    }
  } catch (error) {
    console.error('💥 Error triggering JSON preview flow:', error);
    console.error('💥 Error stack:', error.stack);
    updateIndexingStatus(botMessageElement, 'failed');
  }
}

// Removed automatic completion timer - let users check manually via the JSON link

// Function to update indexing status in the UI
function updateIndexingStatus(botMessageElement, status) {
  const indexingDiv = botMessageElement.querySelector('.indexing-status');
  if (!indexingDiv) return;
  
  // Remove existing status classes
  indexingDiv.classList.remove('completed', 'failed', 'timeout');
  
  switch (status) {
    case 'completed':
      indexingDiv.classList.add('completed');
      indexingDiv.innerHTML = `
        <span>✅ <strong>Indexing Complete!</strong> Assets are now available in the 
        <a href="https://main--mitch-lab--meejain.aem.page/ai-image-generation-log.json" target="_blank" style="color: #4CAF50; text-decoration: underline;">JSON API</a></span>
      `;
      break;
    case 'failed':
      indexingDiv.classList.add('failed');
      indexingDiv.innerHTML = `
        <span>❌ <strong>Indexing Failed</strong> There was an issue updating the JSON API</span>
      `;
      break;
    case 'timeout':
      indexingDiv.classList.add('timeout');
      indexingDiv.innerHTML = `
        <span class="spinner"></span>
        <span>⏰ <strong>Indexing In Progress</strong> Assets may take additional time to appear in JSON API</span>
      `;
      break;
  }
}

// Function to trigger index update flow directly
async function triggerIndexUpdateFlow(botMessageElement) {
  // URL for the Power Automate flow for JSON Preview/Index Update
  const jsonPreviewFlowUrl = 'https://defaultfa7b1b5a7b34438794aed2c178dece.e1.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/355133b004df498b8e7f4e763911d203/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=iDZSvUf5ydsLvckCSJ-4Hh1uN3sFRRcymBoRoBADS_o';
  
  // Get Admin Auth Token from da-config.txt file
  const adminAuthToken = await getAdminAuthTokenFromEnv();
  
  if (!adminAuthToken || adminAuthToken === 'your_admin_token_here') {
    botMessageElement.className = 'bot-msg error';
    botMessageElement.innerHTML = `
      <div class="error-message">
        ⚠️ <strong>Admin Auth Token Required</strong><br>
        <span class="error-text">Please update da-config.txt with your Admin Auth Token.</span><br>
        <span class="retry-text">
          1. Login to <a href="https://admin.hlx.page" target="_blank">admin.hlx.page</a><br>
          2. Get your auth token from browser<br>
          3. Update ADMIN_AUTH_TOKEN in da-config.txt
        </span>
      </div>
    `;
    return;
  }
  
  const requestBody = {
    trigger: 'manual-index-update',
    timestamp: new Date().toISOString(),
    source: 'user-request',
    adminAuthToken: adminAuthToken
  };
  
  try {
    console.log('🔄 Triggering manual index update...');
    
    const response = await fetch(jsonPreviewFlowUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const result = await response.text();
      console.log('✅ Index update flow triggered successfully');
      console.log('📄 Response body:', result);
      
      // Update bot message with success
      botMessageElement.className = 'bot-msg success';
      botMessageElement.innerHTML = `
        <div class="success-message">
          ✅ <strong>Index Update Triggered!</strong><br>
          <span class="status-text">JSON index has been updated in the background.</span><br>
          <span class="status-text">Check the <a href="https://main--mitch-lab--meejain.aem.page/ai-image-generation-log.json" target="_blank" style="color: #4CAF50; text-decoration: underline;">JSON API</a> in a few minutes.</span>
        </div>
      `;
    } else {
      const errorText = await response.text();
      console.warn('❌ Index update flow trigger failed:', response.status);
      console.warn('❌ Error details:', errorText);
      
      botMessageElement.className = 'bot-msg error';
      botMessageElement.innerHTML = `
        <div class="error-message">
          ❌ <strong>Index Update Failed</strong><br>
          <span class="error-text">Unable to trigger index update. Error: ${response.status}</span><br>
          <span class="retry-text">Please try again.</span>
        </div>
      `;
    }
  } catch (error) {
    console.error('💥 Error triggering index update flow:', error);
    
    botMessageElement.className = 'bot-msg error';
    botMessageElement.innerHTML = `
      <div class="error-message">
        ❌ <strong>Index Update Failed</strong><br>
        <span class="error-text">Network error: ${error.message}</span><br>
        <span class="retry-text">Please check your connection and try again.</span>
      </div>
    `;
  }
}

// Function to trigger Excel/DA reset flow
async function triggerResetFlow(botMessageElement) {
  // URL for the DA Reset Flow
  const resetFlowUrl = 'https://defaultfa7b1b5a7b34438794aed2c178dece.e1.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/adaa0bd4307e4d50b0e4b06497c2cdbd/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=r4e24KD9ktF5ib1fabYSgmHCYaHQs1cm1XMCO3-apCM';
  
  // Get DA IMS Token from da-config.txt file
  const daImsToken = await getDATokenFromEnv();
  
  if (!daImsToken || daImsToken === 'your_token_here') {
    botMessageElement.className = 'bot-msg error';
    botMessageElement.innerHTML = `
      <div class="error-message">
        ⚠️ <strong>DA IMS Token Required</strong><br>
        <span class="error-text">Please update da-config.txt with your DA IMS Token.</span><br>
        <span class="retry-text">
          1. Login to <a href="https://da.live" target="_blank">da.live</a><br>
          2. Open browser console and run: <code>copy(adobeIMS.getAccessToken().token)</code><br>
          3. Update DA_IMS_TOKEN in da-config.txt
        </span>
      </div>
    `;
    return;
  }
  
  // Get Admin Auth Token from da-config.txt file
  const adminAuthToken = await getAdminAuthTokenFromEnv();
  
  if (!adminAuthToken || adminAuthToken === 'your_admin_token_here') {
    botMessageElement.className = 'bot-msg error';
    botMessageElement.innerHTML = `
      <div class="error-message">
        ⚠️ <strong>Admin Auth Token Required</strong><br>
        <span class="error-text">Please update da-config.txt with your Admin Auth Token.</span><br>
        <span class="retry-text">
          1. Login to <a href="https://admin.hlx.page" target="_blank">admin.hlx.page</a><br>
          2. Get your auth token from browser<br>
          3. Update ADMIN_AUTH_TOKEN in da-config.txt
        </span>
      </div>
    `;
    return;
  }
  
  const requestBody = {
    daImsToken: daImsToken,
    adminAuthToken: adminAuthToken,
    trigger: 'da-reset',
    timestamp: new Date().toISOString(),
    source: 'user-request'
  };
  
  try {
    console.log('🗑️ Triggering DA sheet reset flow...');
    
    const response = await fetch(resetFlowUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const result = await response.text();
      console.log('✅ Reset flow triggered successfully');
      console.log('📄 Response body:', result);
      
      // Update bot message with success
      botMessageElement.className = 'bot-msg success';
      botMessageElement.innerHTML = `
        <div class="success-message">
          ✅ <strong>DA Sheet Reset Completed!</strong><br>
          <span class="status-text">All data has been cleared from the DA sheet.</span><br>
          <span class="status-text">Only the header row with empty values remains.</span><br>
          <span class="status-text">Type "update index" to refresh the <a href="https://main--devlive-lab1--meejain.aem.page/ai-image-generation-log.json" target="_blank" style="color: #4CAF50; text-decoration: underline;">JSON API</a></span>
        </div>
      `;
    } else {
      const errorText = await response.text();
      console.warn('❌ Reset flow trigger failed:', response.status);
      console.warn('❌ Error details:', errorText);
      
      botMessageElement.className = 'bot-msg error';
      botMessageElement.innerHTML = `
        <div class="error-message">
          ❌ <strong>Reset Failed</strong><br>
          <span class="error-text">Unable to reset DA sheet. Error: ${response.status}</span><br>
          <span class="retry-text">Please try again.</span>
        </div>
      `;
    }
  } catch (error) {
    console.error('💥 Error triggering reset flow:', error);
    
    botMessageElement.className = 'bot-msg error';
    botMessageElement.innerHTML = `
      <div class="error-message">
        ❌ <strong>Reset Failed</strong><br>
        <span class="error-text">Network error: ${error.message}</span><br>
        <span class="retry-text">Please check your connection and try again.</span>
      </div>
    `;
  }
}