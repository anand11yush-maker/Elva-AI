import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ApprovalModal from './ApprovalModal';
import GmailAuthHandler from './GmailAuthHandler';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ChatBox = ({ sessionId, gmailAuthStatus, setGmailAuthStatus, messages, setMessages }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [lastIntentData, setLastIntentData] = useState(null);
  const [currentMessageId, setCurrentMessageId] = useState(null);
  const [automationStatus, setAutomationStatus] = useState(null);
  const [isDirectAutomation, setIsDirectAutomation] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Gmail auth handler
  const gmailAuthHandler = GmailAuthHandler({ 
    gmailAuthStatus, 
    setGmailAuthStatus, 
    sessionId, 
    setMessages 
  });

  useEffect(() => {
    // Check Gmail authentication status
    gmailAuthHandler.checkGmailAuthStatus();
  }, [sessionId]);

  const getAutomationStatusMessage = (message) => {
    const directAutomationPatterns = {
      'check.*linkedin.*notification': '🔔 Checking LinkedIn notifications...',
      'scrape.*product|product.*listing|find.*product': '🛒 Scraping product listings...',
      'job.*alert|linkedin.*job|check.*job': '💼 Checking LinkedIn job alerts...',
      'website.*update|check.*website': '🔍 Monitoring website updates...',
      'competitor.*monitor|monitor.*competitor': '📊 Analyzing competitor data...',
      'news.*article|scrape.*news|latest.*news': '📰 Gathering latest news...'
    };

    const lowerMessage = message.toLowerCase();
    for (const [pattern, status] of Object.entries(directAutomationPatterns)) {
      if (new RegExp(pattern).test(lowerMessage)) {
        return status;
      }
    }
    return null;
  };

  const isDirectAutomationMessage = (message) => {
    return getAutomationStatusMessage(message) !== null;
  };

  // Function to render Gmail success message
  const renderGmailSuccessMessage = () => {
    return (
      <div className="gmail-success-message">
        <div className="gmail-success-title">
          🎉 Gmail Authentication Successful!
        </div>
        
        <div style={{ fontWeight: '600', marginBottom: '12px', color: 'rgba(255, 255, 255, 0.9)' }}>
          Your Gmail account has been securely connected using OAuth2. I can now help you with:
        </div>
        
        <ul className="gmail-features-list">
          <li>📧 Check your Gmail inbox</li>
          <li>✉️ Send emails</li>
          <li>📨 Read specific emails</li>
          <li>🔍 Search your messages</li>
        </ul>
        
        <div className="gmail-example-text">
          Try saying: "Check my Gmail inbox" or "Send an email to [someone]"
        </div>
      </div>
    );
  };

  // Function to render beautiful email cards
  const renderEmailDisplay = (response) => {
    // Handle authentication prompts
    if (response.includes('🔐 Please connect your Gmail account')) {
      return (
        <div className="email-display-card premium-gmail-card">
          <div className="email-header">
            🔐 Gmail Connection Required
          </div>
          <div className="email-item">
            <div className="email-field">
              <span className="email-field-icon">📧</span>
              <span className="email-field-content">
                Please connect your Gmail account to let Elva AI access your inbox.
              </span>
            </div>
            <div className="email-field">
              <span className="email-field-icon">👆</span>
              <span className="email-field-content">
                Click the <strong>"Connect Gmail"</strong> button above to continue.
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Check if this is an email display response
    if (!response.includes('📥') && !response.includes('have') && !response.includes('emails') && !response.includes('unread')) {
      return response;
    }

    // Handle "no unread emails" message
    if (response.includes('No unread emails') || response.includes('all caught up')) {
      return (
        <div className="email-display-card premium-gmail-card">
          <div className="email-header no-emails-header">
            ✅ No unread emails! Your inbox is all caught up.
          </div>
        </div>
      );
    }

    // If the response contains the special email format, parse and render it
    if (response.includes('**From:**') && response.includes('**Subject:**')) {
      const lines = response.split('\n');
      const headerLine = lines[0];
      
      // Extract count from header
      const countMatch = headerLine.match(/(\d+)\s+(?:unread\s+)?emails?/i);
      const count = countMatch ? parseInt(countMatch[1]) : 0;
      
      if (count === 0) {
        return (
          <div className="email-display-card">
            <div className="email-header">
              ✅ No unread emails! Your inbox is all caught up.
            </div>
          </div>
        );
      }

      // Parse individual email blocks
      const emailBlocks = [];
      let currentBlock = null;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.match(/^\*\*\d+\.\*\*/)) {
          // Start of new email block
          if (currentBlock) {
            emailBlocks.push(currentBlock);
          }
          currentBlock = { lines: [line] };
        } else if (currentBlock && line) {
          currentBlock.lines.push(line);
        }
      }
      
      if (currentBlock) {
        emailBlocks.push(currentBlock);
      }

      return (
        <div className="email-display-card premium-gmail-card">
          <div className="email-header">
            📥 You have <span className="email-count-badge-enhanced">{count}</span> unread email{count !== 1 ? 's' : ''}
          </div>
          
          {emailBlocks.map((block, index) => {
            const lines = block.lines;
            let sender = '', subject = '', date = '', snippet = '';
            
            lines.forEach(line => {
              if (line.includes('**From:**')) {
                sender = line.replace(/.*\*\*From:\*\*\s*/, '').trim();
              } else if (line.includes('**Subject:**')) {
                subject = line.replace(/.*\*\*Subject:\*\*\s*/, '').trim();
              } else if (line.includes('**Received:**')) {
                date = line.replace(/.*\*\*Received:\*\*\s*/, '').trim();
              } else if (line.includes('**Snippet:**')) {
                snippet = line.replace(/.*\*\*Snippet:\*\*\s*"?/, '').replace(/"$/, '').trim();
              }
            });
            
            return (
              <div key={index} className="email-item">
                <div className="email-field">
                  <span className="email-field-icon">🧑</span>
                  <span className="email-field-label">From:</span>
                  <span className="email-field-content">{sender}</span>
                </div>
                
                <div className="email-field">
                  <span className="email-field-icon">📨</span>
                  <span className="email-field-label">Subject:</span>
                  <span className="email-field-content">{subject}</span>
                </div>
                
                <div className="email-field">
                  <span className="email-field-icon">🕒</span>
                  <span className="email-field-label">Received:</span>
                  <span className="email-field-content">{date}</span>
                </div>
                
                {snippet && (
                  <div className="email-field">
                    <span className="email-field-icon">✏️</span>
                    <span className="email-field-label">Snippet:</span>
                    <div className="email-field-content">
                      <div className="email-snippet">"{snippet}"</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    return response;
  };

  const renderIntentData = (intentData) => {
    if (!intentData || intentData.intent === 'general_chat') return null;
    
    // Hide intent detection for read-only Gmail actions to reduce clutter
    const gmailReadOnlyIntents = ['check_gmail_inbox', 'check_gmail_unread', 'gmail_inbox_check'];
    if (gmailReadOnlyIntents.includes(intentData.intent)) {
      return null;
    }

    return (
      <div className="mt-3 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
        <div className="text-xs text-blue-300 mb-2 font-medium">
          🎯 Detected Intent: {intentData.intent.replace('_', ' ').toUpperCase()}
        </div>
        <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
          {JSON.stringify(intentData, null, 2)}
        </pre>
      </div>
    );
  };

  const renderAIAvatar = () => {
    return (
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-full flex items-center justify-center mr-3 shadow-lg">
        <span className="text-white text-sm font-bold">🤖</span>
      </div>
    );
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Check if user is trying to approve/reject a pending action
    const approvalKeywords = ['send it', 'approve', 'yes', 'confirm', 'execute', 'do it', 'go ahead'];
    const rejectionKeywords = ['cancel', 'no', 'reject', 'don\'t send', 'abort', 'stop'];
    const message = inputMessage.toLowerCase().trim();
    
    // If there's a pending approval and user uses approval/rejection keywords
    if (pendingApproval && (approvalKeywords.some(keyword => message.includes(keyword)) || 
                           rejectionKeywords.some(keyword => message.includes(keyword)))) {
      
      const isApproval = approvalKeywords.some(keyword => message.includes(keyword));
      
      const userMessage = {
        id: Date.now(),
        message: inputMessage,
        isUser: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');
      
      // Handle the approval/rejection directly
      await handleApproval(isApproval);
      return;
    }

    // If user says approval keywords but there's no pending approval, provide helpful message
    if (!pendingApproval && approvalKeywords.some(keyword => message.includes(keyword))) {
      const userMessage = {
        id: Date.now(),
        message: inputMessage,
        isUser: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');
      
      const helpMessage = {
        id: Date.now() + 1,
        response: "🤔 I don't see any pending actions to approve. Try asking me to do something first, like 'Send an email to John about the meeting' or 'Create a reminder for tomorrow'!",
        isUser: false,
        isSystem: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, helpMessage]);
      return;
    }

    // Check if this is a direct automation request
    const statusMessage = getAutomationStatusMessage(inputMessage);
    const isDirect = isDirectAutomationMessage(inputMessage);
    
    if (isDirect) {
      setIsDirectAutomation(true);
      setAutomationStatus(statusMessage);
    } else {
      setIsDirectAutomation(false);
      setAutomationStatus(null);
    }

    const userMessage = {
      id: Date.now(),
      message: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInputMessage('');

    try {
      const response = await axios.post(`${API}/chat`, {
        message: inputMessage,
        session_id: sessionId,
        user_id: 'default_user'
      });

      const data = response.data;

      // Store parsed intent data for modal use
      if (data.intent_data) {
        setLastIntentData(data.intent_data);
        setCurrentMessageId(data.id);
      }

      const aiMessage = {
        id: data.id,
        message: inputMessage,
        response: data.response,
        intent_data: data.intent_data,
        needs_approval: data.needs_approval,
        isUser: false,
        timestamp: new Date(data.timestamp),
        isDirectAutomation: isDirect
      };

      setMessages(prev => [...prev, aiMessage]);

      // Show approval modal immediately if needed with pre-filled data (but not for direct automation)
      if (data.needs_approval && data.intent_data && !isDirect) {
        setPendingApproval(aiMessage);
        setEditedData(data.intent_data); // Pre-fill with AI-generated data
        setEditMode(true); // Start in edit mode so user can see and modify fields
        setShowApprovalModal(true);
        
      // Add a helpful message about the modal
        const modalHelpMessage = {
          id: Date.now() + 1,
          response: "📋 I've opened the approval modal with pre-filled details. You can review and edit the information above, then click 'Approve' or just type 'Send it' to execute! Type 'Cancel' to abort.",
          isUser: false,
          isSystem: true,
          timestamp: new Date()
        };
        setTimeout(() => {
          setMessages(prev => [...prev, modalHelpMessage]);
        }, 500);
      }

      // Add special handling for Gmail debug commands
      if (inputMessage.toLowerCase().includes('gmail debug') || inputMessage.toLowerCase().includes('test gmail')) {
        const debugTestMessage = {
          id: Date.now() + 1,
          response: `🔧 **Gmail Integration Test**\n\n` +
                   `🔗 **Current Status**: ${gmailAuthStatus.authenticated ? 'Connected ✅' : 'Not Connected ❌'}\n` +
                   `🔑 **Credentials**: ${gmailAuthStatus.credentialsConfigured ? 'Configured ✅' : 'Missing ❌'}\n` +
                   `🆔 **Session ID**: ${sessionId}\n\n` +
                   `**🧪 Test Steps:**\n` +
                   `1. Click the "Connect Gmail" button above\n` +
                   `2. You'll be redirected to Google's OAuth page\n` +
                   `3. Grant permissions to your Google account\n` +
                   `4. You'll be redirected back here\n` +
                   `5. You should see a success message in this chat\n` +
                   `6. The button should change to "Gmail Connected ✅"\n\n` +
                   `**💡 Debug Info**: Click the "Debug Info" button next to the Gmail button for technical details.`,
          isUser: false,
          isSystem: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, debugTestMessage]);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now(),
        response: 'Sorry, I encountered an error. Please try again! 🤖',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setAutomationStatus(null);
      setIsDirectAutomation(false);
    }
  };

  const handleApproval = async (approved) => {
    if (!pendingApproval) return;

    try {
      let finalData = editedData;
      
      // If user made edits, show the edited data in chat
      if (editMode && editedData) {
        const editSummary = {
          id: Date.now(),
          response: `📝 Updated details:\n${JSON.stringify(editedData, null, 2)}`,
          isUser: false,
          isEdit: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, editSummary]);
      }

      const response = await axios.post(`${API}/approve`, {
        session_id: sessionId,
        message_id: currentMessageId || pendingApproval.id,
        approved: approved,
        edited_data: editMode ? finalData : null
      });

      const statusMessage = {
        id: Date.now(),
        response: approved ? 
          '✅ Perfect! Action executed successfully! Your request has been sent to the automation system.' : 
          '❌ No worries! Action cancelled as requested.',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, statusMessage]);

      // If successful and approved, show n8n response details
      if (approved && response.data.n8n_response) {
        const n8nMessage = {
          id: Date.now() + 1,
          response: `🔗 Automation Response: ${JSON.stringify(response.data.n8n_response, null, 2)}`,
          isUser: false,
          isSystem: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, n8nMessage]);
      }

    } catch (error) {
      console.error('Error handling approval:', error);
      const errorMessage = {
        id: Date.now(),
        response: '⚠️ Something went wrong with the approval. Please try again!',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setShowApprovalModal(false);
      setPendingApproval(null);
      setEditMode(false);
      setEditedData(null);
      setLastIntentData(null);
      setCurrentMessageId(null);
    }
  };

  const renderEditForm = () => {
    if (!editedData) return null;

    const handleFieldChange = (field, value) => {
      setEditedData(prev => ({
        ...prev,
        [field]: value
      }));
    };

    return (
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-blue-300 flex items-center">
          <span className="mr-2">✏️</span>
          Edit Action Details:
        </h4>
        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
          {Object.entries(editedData).map(([key, value]) => {
            if (key === 'intent') return null;
            
            return (
              <div key={key} className="mb-3 last:mb-0">
                <label className="block text-sm text-blue-200 mb-2 capitalize font-medium">
                  {key.replace(/_/g, ' ')}:
                </label>
                {Array.isArray(value) ? (
                  <input
                    type="text"
                    value={value.join(', ')}
                    onChange={(e) => handleFieldChange(key, e.target.value.split(', ').filter(v => v.trim()))}
                    className="w-full px-4 py-3 bg-gray-800 border border-blue-500/30 rounded-lg text-white text-sm focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 placeholder-gray-500"
                    placeholder={`Enter ${key.replace(/_/g, ' ')}...`}
                  />
                ) : (
                  <textarea
                    value={value || ''}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    rows={key === 'body' || key === 'post_content' ? 4 : 2}
                    className="w-full px-4 py-3 bg-gray-800 border border-blue-500/30 rounded-lg text-white text-sm resize-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 placeholder-gray-500"
                    placeholder={`Enter ${key.replace(/_/g, ' ')}...`}
                  />
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
          <div className="text-xs text-green-300 mb-2">✅ Current Values Preview:</div>
          <pre className="text-xs text-green-200 whitespace-pre-wrap font-mono">
            {JSON.stringify(editedData, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-blue-500/50 scrollbar-track-transparent">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            renderEmailDisplay={renderEmailDisplay}
            renderIntentData={renderIntentData}
            renderAIAvatar={renderAIAvatar}
            renderGmailSuccessMessage={renderGmailSuccessMessage}
          />
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="max-w-3xl">
              <div className="message-bubble p-4 rounded-xl bg-gray-800/40 backdrop-blur-sm border border-gray-600/30">
                <div className="flex items-start space-x-3">
                  {renderAIAvatar()}
                  <div className="flex-1">
                    <div className="loading-dots">
                      <div className="loading-dot bg-blue-400"></div>
                      <div className="loading-dot bg-blue-500"></div>
                      <div className="loading-dot bg-blue-600"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4">
        <MessageInput
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          sendMessage={sendMessage}
          isLoading={isLoading}
          automationStatus={automationStatus}
        />
      </div>

      {/* Approval Modal */}
      <ApprovalModal
        showApprovalModal={showApprovalModal}
        pendingApproval={pendingApproval}
        editMode={editMode}
        setEditMode={setEditMode}
        editedData={editedData}
        setEditedData={setEditedData}
        handleApproval={handleApproval}
        renderEditForm={renderEditForm}
      />
    </div>
  );
};

export default ChatBox;