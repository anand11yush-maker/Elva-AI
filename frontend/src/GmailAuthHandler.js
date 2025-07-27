import { useEffect } from 'react';
import axios from 'axios';
import { useToast } from './context/ToastContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function GmailAuthHandler({ gmailAuthStatus, setGmailAuthStatus, sessionId, setMessages, checkGmailStatus }) {
  const { showGmailSuccess, showGmailError } = useToast();
  
  // Check Gmail authentication status
  const checkGmailAuthStatus = async () => {
    try {
      console.log('🔍 Checking Gmail auth status for session:', sessionId);
      
      // Add loading state
      setGmailAuthStatus(prev => ({ ...prev, loading: true }));
      
      const response = await axios.get(`${API}/gmail/status?session_id=${sessionId}`);
      const data = response.data;
      
      console.log('📊 Gmail Auth Status Response:', data);
      
      setGmailAuthStatus({ 
        authenticated: data.authenticated || false,
        loading: false,
        credentialsConfigured: data.credentials_configured || false,
        error: data.error || null,
        debugInfo: {
          success: data.success,
          requires_auth: data.requires_auth,
          scopes: data.scopes,
          service: data.service,
          session_id: data.session_id
        }
      });
      
      // Store authentication status in localStorage for persistence
      if (data.authenticated) {
        localStorage.setItem('gmail-auth-status', 'true');
      } else {
        localStorage.removeItem('gmail-auth-status');
      }
      
      // Only show debug information for actual issues, not just unauthenticated status
      if (!data.success || !data.credentials_configured || data.error) {
        console.log('🔧 Gmail Auth Issues Detected:', data);
        
        const debugMessage = {
          id: 'gmail_debug_' + Date.now(),
          response: `🔧 **Gmail Connection Debug**\n\n` +
            `📋 **Status**: ${data.success ? 'Service Running' : 'Service Error'}\n` +
            `🔑 **Credentials**: ${data.credentials_configured ? 'Configured ✅' : 'Missing ❌'}\n` +
            `🔐 **Authentication**: ${data.authenticated ? 'Connected ✅' : 'Not Connected ❌'}\n` +
            `🆔 **Session ID**: ${sessionId}\n` +
            (data.error ? `❌ **Error**: ${data.error}\n` : '') +
            `\n` +
            (!data.credentials_configured ? 
              '⚠️ **Issue**: Gmail credentials.json file is missing from backend. This is required for OAuth2 authentication to work properly.' : 
              data.error ? 
                `⚠️ **Issue**: ${data.error}` : 
                '💡 Click "Connect Gmail" above to authenticate with your Google account.'),
          isUser: false,
          isSystem: true,
          timestamp: new Date()
        };
        
        // Only add debug message if there are actual errors, not just lack of authentication
        if (!data.credentials_configured || data.error) {
          setTimeout(() => {
            setMessages(prev => {
              const hasDebugMessage = prev.some(msg => msg.id && msg.id.startsWith('gmail_debug_'));
              if (!hasDebugMessage) {
                return [...prev, debugMessage];
              }
              return prev;
            });
          }, 1000);
        }
      }
      
    } catch (error) {
      console.error('❌ Gmail auth status check failed:', error);
      setGmailAuthStatus({ 
        authenticated: false, 
        loading: false,
        credentialsConfigured: false,
        error: error.message,
        debugInfo: { error: error.response?.data || error.message }
      });
      
      // Remove any stored auth status on error
      localStorage.removeItem('gmail-auth-status');
    }
  };

  const initiateGmailAuth = async () => {
    try {
      const response = await axios.get(`${API}/gmail/auth?session_id=${sessionId}`);
      if (response.data.success && response.data.auth_url) {
        // Add session ID to the auth URL state parameter
        const authUrl = new URL(response.data.auth_url);
        const currentState = authUrl.searchParams.get('state') || '';
        authUrl.searchParams.set('state', `${sessionId}_${currentState}`);
        
        // Redirect to Google OAuth2 with session-aware state
        window.location.href = authUrl.toString();
      } else {
        console.error('Failed to get Gmail auth URL:', response.data.message);
      }
    } catch (error) {
      console.error('Gmail auth initiation failed:', error);
    }
  };

  const handleGmailAuthSuccess = async () => {
    try {
      // Update auth status first using the function from App.js
      if (checkGmailStatus) {
        await checkGmailStatus(); // This will update the main App state
      } else {
        await checkGmailAuthStatus(); // Fallback to local check
      }
      
      // Store authentication success in localStorage
      localStorage.setItem('gmail-auth-status', 'true');
      
      // 🔔 Show toast notification instead of chat message
      showGmailSuccess();
      
      console.log('✅ Gmail authentication successful - toast notification shown!');
    } catch (error) {
      console.error('Error handling Gmail auth success:', error);
      showGmailError('Error completing Gmail authentication setup');
    }
  };

  const handleGmailAuthError = (errorMessage, details) => {
    try {
      // Update auth status and re-check
      if (checkGmailStatus) {
        checkGmailStatus(); // This will update the main App state
      } else {
        checkGmailAuthStatus(); // Fallback to local check
      }
      
      // Map error codes to user-friendly messages
      let userMessage = 'Gmail authentication failed. Please try again.';
      let debugInfo = details || '';
      
      switch(errorMessage) {
        case 'access_denied':
          userMessage = 'Gmail authentication was cancelled. You can try connecting again anytime.';
          debugInfo = 'User denied access during OAuth2 flow.';
          break;
        case 'no_code':
          userMessage = 'Gmail authentication failed - no authorization received.';
          debugInfo = 'OAuth2 callback did not receive authorization code.';
          break;
        case 'auth_failed':
          userMessage = 'Gmail authentication failed during token exchange.';
          debugInfo = details || 'Token exchange with Google failed.';
          break;
        case 'server_error':
          userMessage = 'Gmail authentication failed due to a server error.';
          debugInfo = details || 'Backend server error during OAuth2 processing.';
          break;
        default:
          debugInfo = details || `Unknown error: ${errorMessage}`;
      }
      
      console.error('🚨 Gmail Auth Error Details:', { errorMessage, details, debugInfo });
      
      // Add error message to chat with debug info
      const errorMsg = {
        id: 'gmail_auth_error_' + Date.now(),
        session_id: sessionId,
        user_id: 'system', 
        message: '❌ Gmail Authentication Failed',
        response: `❌ **Gmail Authentication Error**\n\n${userMessage}\n\n` +
                 `🔧 **Debug Info**: ${debugInfo}\n` +
                 `🆔 **Session**: ${sessionId}\n\n` +
                 `💡 **Next Steps**: Check the "Connect Gmail" button above shows the correct status, or try the authentication flow again.`,
        timestamp: new Date().toISOString(),
        intent_data: null,
        needs_approval: false
      };
      
      setMessages(prev => [...prev, errorMsg]);
      
      console.error('Gmail authentication error processed');
    } catch (error) {
      console.error('Error handling Gmail auth error:', error);
    }
  };

  const handleGmailCallback = async (authorizationCode) => {
    try {
      const response = await axios.post(`${API}/gmail/callback`, {
        code: authorizationCode
      });
      
      if (response.data.success) {
        // Clear URL parameters
        window.history.replaceState({}, document.title, '/');
        
        // Update auth status
        setGmailAuthStatus({ authenticated: true, loading: false });
        
        // 🔔 Show toast notification instead of chat message
        showGmailSuccess();
      } else {
        console.error('Gmail OAuth callback failed:', response.data.message);
        showGmailError('Gmail authentication failed');
      }
    } catch (error) {
      console.error('Gmail callback handling failed:', error);
      showGmailError('Gmail authentication failed');
    }
  };

  // Gmail Debug Function
  const showGmailDebugInfo = async () => {
    try {
      const response = await axios.get(`${API}/gmail/debug`);
      const debugInfo = response.data;
      
      const debugMessage = {
        id: 'gmail_debug_detailed_' + Date.now(),
        response: '🔧 **Gmail Integration Debug Report**\n\n' +
                 `📁 **Credentials File**: ${debugInfo.debug_info.gmail_service_status.credentials_file_exists ? 'Found ✅' : 'Missing ❌'}\n` +
                 `📂 **File Path**: ${debugInfo.debug_info.gmail_service_status.credentials_file_path}\n` +
                 `🔑 **Client ID Configured**: ${debugInfo.debug_info.gmail_service_status.credentials_content?.client_id_configured ? 'Yes ✅' : 'No ❌'}\n` +
                 `🔄 **Redirect URI Configured**: ${debugInfo.debug_info.gmail_service_status.credentials_content?.redirect_uri_configured ? 'Yes ✅' : 'No ❌'}\n` +
                 `🗄️ **Database Connection**: ${debugInfo.debug_info.database_status.connection === 'connected' ? 'Connected ✅' : 'Error ❌'}\n` +
                 `🎫 **Stored Tokens**: ${debugInfo.debug_info.database_status.gmail_token_count} tokens found\n` +
                 `🌐 **Environment Variables**: ${debugInfo.debug_info.environment.GMAIL_REDIRECT_URI ? 'Configured ✅' : 'Missing ❌'}\n\n` +
                 `**🔧 Next Steps:**\n` +
                 (!debugInfo.debug_info.gmail_service_status.credentials_file_exists ? 
                   '1. **Missing credentials.json** - You need to add your Google OAuth2 credentials file to `/app/backend/credentials.json`\n' +
                   '2. See `/app/backend/credentials.json.template` for the required format\n' +
                   '3. Get credentials from [Google Cloud Console](https://console.cloud.google.com/)\n' : 
                   debugInfo.debug_info.database_status.connection !== 'connected' ?
                   '1. **Database Issue** - MongoDB connection problem\n' :
                   '1. **Setup looks good** - Try the OAuth2 flow again\n'
                 ),
        isUser: false,
        isSystem: true,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, debugMessage]);
      
    } catch (error) {
      console.error('Failed to get debug info:', error);
      const errorMessage = {
        id: 'debug_error_' + Date.now(),
        response: '❌ **Debug Error**: Failed to retrieve Gmail debug information. Check console for details.',
        isUser: false,
        isSystem: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Handle Gmail OAuth redirect response
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const auth = urlParams.get('auth');
    const service = urlParams.get('service');
    const message = urlParams.get('message');
    const details = urlParams.get('details');
    const returnedSessionId = urlParams.get('session_id');
    
    console.log('🔍 OAuth Redirect Params:', { auth, service, message, details, returnedSessionId, currentSessionId: sessionId });
    
    if (auth === 'success' && service === 'gmail') {
      // Gmail authentication successful
      console.log('✅ Processing Gmail auth success');
      handleGmailAuthSuccess();
      // Clear URL parameters
      window.history.replaceState({}, document.title, '/');
    } else if (auth === 'error') {
      // Gmail authentication failed
      console.error('❌ Processing Gmail auth error:', message, details);
      handleGmailAuthError(message, details);
      // Clear URL parameters  
      window.history.replaceState({}, document.title, '/');
    }
  }, [sessionId]);

  // Check Gmail authentication status on mount
  useEffect(() => {
    checkGmailAuthStatus();
  }, [sessionId]);

  // Return the handler functions
  return {
    checkGmailAuthStatus,
    initiateGmailAuth,
    handleGmailAuthSuccess,
    handleGmailAuthError,
    handleGmailCallback,
    showGmailDebugInfo
  };
}

export default GmailAuthHandler;