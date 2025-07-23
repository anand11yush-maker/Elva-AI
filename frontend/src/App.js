import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import TypewriterTagline from './TypewriterTagline';
import ChatBox from './ChatBox';
import DropdownMenu from './DropdownMenu';
import GmailAuthHandler from './GmailAuthHandler';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(generateSessionId());
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    // Initialize theme from localStorage or default to dark
    const savedTheme = localStorage.getItem('elva-theme');
    return savedTheme ? savedTheme === 'dark' : true;
  }); // Theme toggle state with localStorage persistence
  const [gmailAuthStatus, setGmailAuthStatus] = useState({ 
    authenticated: false, 
    loading: true, 
    credentialsConfigured: false,
    error: null,
    debugInfo: null 
  }); // Gmail authentication status
  const [showDropPanel, setShowDropPanel] = useState(false); // Drop-left panel state

  function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Initialize theme on app load
  useEffect(() => {
    const savedTheme = localStorage.getItem('elva-theme');
    const isInitiallyDark = savedTheme ? savedTheme === 'dark' : true;
    
    if (isInitiallyDark) {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
    } else {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    }
  }, []);

  useEffect(() => {
    loadChatHistory();
    // Add welcome message when starting a new chat
    if (messages.length === 0) {
      addWelcomeMessage();
    }
  }, [sessionId]);

  const addWelcomeMessage = () => {
    const baseMessage = "Hi Buddy 👋 Good to see you! Elva AI at your service. Ask me anything or tell me what to do!";
    const gmailMessage = gmailAuthStatus.authenticated 
      ? "\n\n🎉 **Gmail is connected!** I can now help you with:\n• 📧 Check your Gmail inbox\n• ✉️ Send emails\n• 📨 Read specific emails\n• 🔍 Search your messages"
      : "\n\n💡 **Tip:** Connect Gmail above for email assistance!";
    
    const welcomeMessage = {
      id: 'welcome_' + Date.now(),
      response: baseMessage + gmailMessage,
      isUser: false,
      isWelcome: true,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  const loadChatHistory = async () => {
    try {
      const response = await axios.get(`${API}/history/${sessionId}`);
      const historyMessages = response.data.messages || [];
      if (historyMessages.length === 0) {
        addWelcomeMessage();
      } else {
        setMessages(historyMessages.map(msg => ({
          ...msg,
          isUser: false, // History messages are from AI
          timestamp: new Date(msg.timestamp)
        })));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      addWelcomeMessage();
    }
  };

  const startNewChat = () => {
    setSessionId(generateSessionId());
    setMessages([]);
    setShowDropPanel(false); // Close panel when starting new chat
  };

  // Theme toggle function with localStorage persistence
  const toggleTheme = () => {
    const newTheme = !isDarkTheme;
    setIsDarkTheme(newTheme);
    
    // Save theme preference to localStorage
    localStorage.setItem('elva-theme', newTheme ? 'dark' : 'light');
    
    // Apply theme changes to document
    if (newTheme) {
      // Dark theme
      document.documentElement.classList.remove('light-theme');
      document.documentElement.classList.add('dark-theme');
    } else {
      // Light theme
      document.documentElement.classList.remove('dark-theme');
      document.documentElement.classList.add('light-theme');
    }
  };

  // Export chat function
  const exportChat = () => {
    const chatData = messages.map(msg => `${msg.isUser ? 'User' : 'AI'}: ${msg.message || msg.response}`).join('\n\n');
    const blob = new Blob([chatData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elva-chat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowDropPanel(false); // Close panel after export
  };

  // Initialize Gmail auth handler
  const gmailAuthHandler = GmailAuthHandler({ 
    gmailAuthStatus, 
    setGmailAuthStatus, 
    sessionId, 
    setMessages 
  });

  return (
    <div className="min-h-screen chat-background text-white">
      {/* Premium Glassy Header */}
      <div className="glassy-header shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-4">
            <div className="logo-container">
              <img 
                src="/logo.svg" 
                alt="Elva AI Logo" 
                className="elva-logo"
                onError={(e) => {
                  // Fallback to gradient logo if image fails to load
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              {/* Fallback gradient logo */}
              <div 
                className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600
                         rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg"
                style={{ display: 'none' }}
              >
                E
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold smooth-glow-title">Elva AI</h1>
              <TypewriterTagline />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Drop-Left Panel with 3D Buttons */}
            <DropdownMenu
              showDropPanel={showDropPanel}
              setShowDropPanel={setShowDropPanel}
              toggleTheme={toggleTheme}
              isDarkTheme={isDarkTheme}
              exportChat={exportChat}
              startNewChat={startNewChat}
              gmailAuthStatus={gmailAuthStatus}
              initiateGmailAuth={gmailAuthHandler.initiateGmailAuth}
            />
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="premium-chat-container flex-1 flex">
        <ChatBox
          sessionId={sessionId}
          gmailAuthStatus={gmailAuthStatus}
          setGmailAuthStatus={setGmailAuthStatus}
          messages={messages}
          setMessages={setMessages}
        />
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen chat-background text-white">
      {/* Premium Glassy Header */}
      <div className="glassy-header shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-4">
            <div className="logo-container">
              <img 
                src="/logo.svg" 
                alt="Elva AI Logo" 
                className="elva-logo"
                onError={(e) => {
                  // Fallback to gradient logo if image fails to load
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              {/* Fallback gradient logo */}
              <div 
                className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl border-2 border-blue-400/20"
                style={{ display: 'none' }}
              >
                <span className="text-2xl font-bold">E</span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl smooth-glow-title">
                Elva AI
              </h1>
              <TypewriterTagline 
                text="Your personal smart assistant" 
                className="text-xs font-medium"
                speed={120}
                pauseDuration={3000}
                eraseSpeed={80}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Drop-Left Panel with 3D Buttons */}
            <div className="relative" ref={dropPanelRef}>
              {/* Plus Button Trigger */}
              <button
                onClick={toggleDropPanel}
                className="circular-icon-btn new-chat-btn"
                title="Open Menu"
              >
                <motion.div 
                  className="plus-icon"
                  animate={{ rotate: showDropPanel ? 45 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  +
                </motion.div>
              </button>

              {/* Drop-Down Panel */}
              <AnimatePresence>
                {showDropPanel && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.8 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 300, 
                      damping: 25,
                      duration: 0.4 
                    }}
                    className="drop-down-panel"
                  >
                    <div className="drop-panel-content">
                      {/* Gmail Button */}
                      <motion.button
                        onClick={gmailAuthStatus.authenticated ? null : initiateGmailAuth}
                        className={`panel-btn gmail-panel-btn ${
                          gmailAuthStatus.authenticated 
                            ? 'gmail-connected' 
                            : gmailAuthStatus.credentialsConfigured 
                              ? 'gmail-ready' 
                              : 'gmail-error'
                        }`}
                        title={
                          gmailAuthStatus.authenticated 
                            ? "Gmail Connected ✅" 
                            : gmailAuthStatus.credentialsConfigured 
                              ? "Connect Gmail" 
                              : "Gmail credentials missing ❌"
                        }
                        disabled={gmailAuthStatus.authenticated || !gmailAuthStatus.credentialsConfigured}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="btn-icon-text">
                          {gmailAuthStatus.authenticated ? '✅' : '📧'}
                        </div>
                      </motion.button>

                      {/* Theme Toggle Button */}
                      <motion.button
                        onClick={toggleTheme}
                        className="panel-btn theme-panel-btn"
                        title="Toggle Theme"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <motion.div
                          className="btn-icon-text"
                          animate={{ rotate: isDarkTheme ? 0 : 180 }}
                          transition={{ duration: 0.5 }}
                        >
                          {isDarkTheme ? '🌙' : '☀️'}
                        </motion.div>
                      </motion.button>

                      {/* Export Chat Button */}
                      <motion.button
                        onClick={exportChat}
                        className="panel-btn export-panel-btn"
                        title="Export Chat"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="btn-icon-text">📤</div>
                      </motion.button>

                      {/* New Chat Button */}
                      <motion.button
                        onClick={startNewChat}
                        className="panel-btn new-chat-panel-btn"
                        title="Start New Chat"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="btn-icon-text">➕</div>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area with Premium Container */}
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col h-screen premium-chat-container">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-6 scrollbar-thin scrollbar-thumb-blue-500/50 scrollbar-track-transparent">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <span className="text-3xl">🤖</span>
              </div>
              <h2 className="text-2xl font-bold mb-3 smooth-glow-title">
                Welcome to Elva AI!
              </h2>
              <TypewriterTagline 
                text="Your personal smart assistant" 
                className="text-lg mb-2"
                speed={100}
                pauseDuration={2500}
                eraseSpeed={70}
              />
              <p className="text-gray-500 text-sm mt-2">I can help you with emails, calendar events, reminders, todos, LinkedIn posts, and general conversation.</p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'} animate-slide-in`}>
              <div className={`flex max-w-xs lg:max-w-md ${msg.isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {!msg.isUser && renderAIAvatar()}
                <div className={`px-4 py-3 rounded-2xl ${
                  msg.isUser 
                    ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white shadow-lg ml-3' 
                    : msg.isEdit
                      ? 'bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-2 border-green-400/40 backdrop-blur-sm shadow-lg'
                      : msg.isSystem
                        ? 'bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border-2 border-cyan-400/40 backdrop-blur-sm shadow-lg'
                        : msg.isDirectAutomation
                          ? 'bg-gradient-to-r from-orange-900/40 to-red-900/40 border-2 border-orange-400/40 backdrop-blur-sm shadow-lg'
                          : 'bg-black/30 border border-blue-500/20 backdrop-blur-sm shadow-lg'
                } ${msg.isWelcome ? 'border-2 border-blue-400/40 bg-gradient-to-r from-blue-900/40 to-purple-900/40' : ''}`}>
                  <div className="text-sm leading-relaxed">
                    {msg.isUser ? msg.message : 
                     msg.isGmailSuccess ? renderGmailSuccessMessage() :
                     renderEmailDisplay(msg.response)}
                    {msg.isWelcome && (
                      <div className="mt-2 text-xs text-blue-300 flex items-center">
                        <span className="animate-pulse">✨</span>
                        <span className="ml-1">Ready to help you!</span>
                      </div>
                    )}
                    {msg.isEdit && (
                      <div className="mt-2 text-xs text-green-300 flex items-center">
                        <span>📝</span>
                        <span className="ml-1">Your customizations</span>
                      </div>
                    )}
                    {msg.isSystem && (
                      <div className="mt-2 text-xs text-cyan-300 flex items-center">
                        <span>🔗</span>
                        <span className="ml-1">System Response</span>
                      </div>
                    )}
                    {msg.isDirectAutomation && (
                      <div className="mt-2 text-xs text-orange-300 flex items-center">
                        <span>⚡</span>
                        <span className="ml-1">Direct automation result</span>
                      </div>
                    )}
                  </div>
                  {!msg.isUser && !msg.isEdit && !msg.isSystem && renderIntentData(msg.intent_data)}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start animate-slide-in">
              <div className="flex flex-col">
                {/* Show automation status if this is direct automation */}
                {automationStatus && isDirectAutomation && (
                  <div className="automation-status mb-3 ml-11">
                    <div className="shimmer-text">
                      {automationStatus}
                    </div>
                  </div>
                )}
                
                <div className="flex">
                  {renderAIAvatar()}
                  <div className="bg-black/30 border border-blue-500/20 backdrop-blur-sm px-4 py-3 rounded-2xl shadow-lg">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Glassy Input Area */}
        <div className="glassy-input-area rounded-2xl p-4 shadow-xl">
          <div className="flex space-x-4">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask me anything... ✨"
              className="flex-1 clean-input"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-500 hover:via-purple-500 hover:to-indigo-500 disabled:from-gray-600 disabled:to-gray-700 px-8 py-3 rounded-full transition-all duration-300 disabled:cursor-not-allowed shadow-lg hover:shadow-xl border border-blue-500/20"
            >
              <span className="font-medium">Send</span>
            </button>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && pendingApproval && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900/95 border border-blue-500/30 rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl backdrop-blur-xl">
            <h3 className="text-xl font-bold mb-4 text-blue-300 flex items-center">
              <span className="mr-2">🔍</span>
              Review AI-Generated Action
            </h3>
            
            <div className="mb-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
              <div className="text-xs text-green-300 flex items-center mb-1">
                <span className="mr-2">✨</span>
                <span>AI has pre-filled all the details below based on your request</span>
              </div>
              <div className="text-xs text-gray-400">
                Review the information, make any changes needed, then approve to execute!
              </div>
            </div>
            
            <div className="mb-6">
              <div className="text-sm text-gray-300 mb-3 font-medium">🤖 AI Summary:</div>
              <div className="bg-black/40 p-4 rounded-lg text-sm border border-blue-500/20">
                {pendingApproval.response}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-300 font-medium">⚙️ Action Configuration:</div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className={`text-xs px-3 py-1.5 border rounded-full transition-all duration-200 ${
                      editMode 
                        ? 'text-red-400 border-red-500/30 hover:border-red-400/50 bg-red-900/20' 
                        : 'text-blue-400 border-blue-500/30 hover:border-blue-400/50 bg-blue-900/20'
                    }`}
                  >
                    {editMode ? '👀 View Only' : '✏️ Edit Fields'}
                  </button>
                </div>
              </div>
              
              {editMode ? renderEditForm() : (
                <div className="bg-black/40 p-4 rounded-lg border border-blue-500/20">
                  <div className="text-xs text-blue-300 mb-2">📋 Detected Intent Data:</div>
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto font-mono">
                    {JSON.stringify(editedData, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => handleApproval(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-lg transition-colors border border-gray-600/50 font-medium flex items-center justify-center"
              >
                <span className="mr-2">❌</span>
                Cancel
              </button>
              <button
                onClick={() => handleApproval(true)}
                className="flex-1 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-500 hover:via-purple-500 hover:to-indigo-500 px-4 py-3 rounded-lg transition-all duration-300 shadow-lg font-medium flex items-center justify-center"
              >
                <span className="mr-2">✅</span>
                {editMode ? 'Approve Changes' : 'Approve Action'}
              </button>
            </div>

            {editMode && (
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="text-xs text-blue-300 flex items-center">
                  <span className="mr-2">💡</span>
                  Tip: Make your changes above, then click "Approve Changes" to execute with your modifications!
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;