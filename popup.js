let conversationHistory = [];

// DOM elements
const chatHistory = document.getElementById('chatHistory');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const resetButton = document.getElementById('resetButton');

// Initialize the extension
document.addEventListener('DOMContentLoaded', function() {
  // Load any saved conversation (will be useful if we implement persistence)
  loadConversation();
  
  // Add event listeners
  sendButton.addEventListener('click', sendMessage);
  resetButton.addEventListener('click', resetConversation);
  
  // Allow sending messages with Enter key (Shift+Enter for newline)
  userInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
});

// Send a message to DeepSeek and display the response
async function sendMessage() {
  const userMessage = userInput.value.trim();
  
  // Don't send empty messages
  if (!userMessage) return;
  
  // Clear the input field
  userInput.value = '';
  
  // Display user message
  addMessage('user', userMessage);
  
  // Add message to conversation history
  conversationHistory.push({ role: 'user', content: userMessage });
  
  // Show loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message ai-message loading';
  chatHistory.appendChild(loadingDiv);
  
  try {
    // Call DeepSeek API
    const response = await callDeepSeekAPI(conversationHistory);
    
    // Remove loading indicator
    chatHistory.removeChild(loadingDiv);
    
    // Display AI response
    addMessage('ai', response);
    
    // Add response to conversation history
    conversationHistory.push({ role: 'assistant', content: response });
    
    // Save conversation
    saveConversation();
    
  } catch (error) {
    // Remove loading indicator
    chatHistory.removeChild(loadingDiv);
    
    // Display error message
    addMessage('ai', `Error: ${error.message || 'Could not connect to DeepSeek. Please try again.'}`);
  }
  
  // Scroll to bottom of chat
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Call the DeepSeek API via Hack Club endpoint
async function callDeepSeekAPI(messages) {
  const apiUrl = 'https://ai.hackclub.com/chat/completions';
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages })
    });
    
    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
}

// Add a message to the chat display
function addMessage(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}-message`;
  messageDiv.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
  
  // Process markdown-like syntax for code blocks
  const formattedContent = formatMessageContent(content);
  
  messageDiv.innerHTML = formattedContent;
  chatHistory.appendChild(messageDiv);
}

// Format message content to handle code blocks and other formatting
function formatMessageContent(content) {
  // Replace code blocks (```code```)
  let formatted = content.replace(/```([\s\S]*?)```/g, function(match, code) {
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  });
  
  // Replace inline code (`code`)
  formatted = formatted.replace(/`([^`]+)`/g, function(match, code) {
    return `<code>${escapeHtml(code)}</code>`;
  });
  
  // Replace newlines with <br>
  formatted = formatted.replace(/\n/g, '<br>');
  
  return formatted;
}

// Helper to escape HTML special characters
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Reset the conversation
function resetConversation() {
  conversationHistory = [];
  chatHistory.innerHTML = '';
  saveConversation();
}

// Save conversation to Chrome storage (for persistence)
function saveConversation() {
  chrome.storage.local.set({ 'conversation': conversationHistory });
}

// Load conversation from Chrome storage
function loadConversation() {
  chrome.storage.local.get('conversation', function(data) {
    if (data.conversation && data.conversation.length > 0) {
      conversationHistory = data.conversation;
      
      // Display loaded messages
      conversationHistory.forEach(msg => {
        const role = msg.role === 'user' ? 'user' : 'ai';
        addMessage(role, msg.content);
      });
      
      // Scroll to bottom of chat
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }
  });
}
