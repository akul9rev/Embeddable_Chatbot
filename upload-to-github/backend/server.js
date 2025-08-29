const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

let genAI, model;
console.log('🔍 Environment check:');
console.log('   GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('   GEMINI_API_KEY value:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'NOT SET');

if (process.env.GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log('✅ Google Gemini AI initialized successfully');
    console.log('   Model variable set:', !!model);
    global.geminiModel = model;
  } catch (error) {
    console.error('❌ Failed to initialize Gemini AI:', error.message);
    model = null;
    global.geminiModel = null;
  }
} else {
  console.warn('⚠️  GEMINI_API_KEY not found in environment variables');
  console.log('   Current working directory:', process.cwd());
  console.log('   Looking for .env file at:', path.join(__dirname, '..', '.env'));
  model = null;
  global.geminiModel = null;
}


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: true,
  credentials: true
}));

app.use('/widget', express.static('widget'));
app.use('/demo', express.static('demo'));

const chatSessions = new Map();

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW_MS || 900000;
const RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX_REQUESTS || 100;

function rateLimit(req, res, next) {
  const clientId = req.ip || 'unknown';
  const now = Date.now();
  
  if (!rateLimitMap.has(clientId)) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const clientData = rateLimitMap.get(clientId);
  
  if (now > clientData.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  if (clientData.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
    });
  }
  
  clientData.count++;
  next();
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});


app.get('/api/widget/config/:configId?', (req, res) => {
  const configId = req.params.configId || 'default';
  
  const defaultConfig = {
    title: 'Chat with us!',
    welcomeMessage: 'Hi! How can I help you today?',
    placeholder: 'Type a message...',
    position: 'bottom-right',
    theme: {
      primaryColor: '#667eea',
      secondaryColor: '#764ba2',
      textColor: '#333333',
      backgroundColor: '#ffffff'
    },
    features: {
      typing: true,
      sound: false,
      emoji: true,
      fileUpload: false
    }
  };
  

  res.json({
    success: true,
    config: defaultConfig,
    configId: configId
  });
});


app.post('/api/chat', rateLimit, async (req, res) => {
  try {
    const { message, sessionId, context } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }
    

    let session = chatSessions.get(sessionId) || {
      id: sessionId,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    console.log('🔍 Chat endpoint debug:');
    console.log('   GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
    console.log('   Global model exists:', !!global.geminiModel);
    console.log('   Model type:', typeof global.geminiModel);
    
    if (!process.env.GEMINI_API_KEY || !global.geminiModel) {

      console.log('🔄 Using fallback response (no AI configured)');
      
      const fallbackResponse = getFallbackResponse(message);
      

      session.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });
      

      session.messages.push({
        role: 'assistant',
        content: fallbackResponse,
        timestamp: new Date()
      });
      
      session.lastActivity = new Date();
      chatSessions.set(sessionId, session);
      
      return res.json({
        success: true,
        response: fallbackResponse,
        sessionId: sessionId,
        isAI: false,
        source: 'fallback'
      });
    }
    

    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    

    const conversationHistory = session.messages
      .slice(-10)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    

    const systemPrompt = `You are a helpful, friendly customer support chatbot. 
    You should:
    - Be concise but helpful
    - Ask clarifying questions when needed
    - Provide practical solutions
    - Be polite and professional
    - If you don't know something, admit it and suggest alternatives
    
    Previous conversation:
    ${conversationHistory}
    
    User's latest message: ${message}`;
    

    const result = await global.geminiModel.generateContent(systemPrompt);
    const aiResponse = result.response.text();
    

    session.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    });
    
    session.lastActivity = new Date();
    chatSessions.set(sessionId, session);
    

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [id, sess] of chatSessions.entries()) {
      if (sess.lastActivity < oneHourAgo) {
        chatSessions.delete(id);
      }
    }
    
    res.json({
      success: true,
      response: aiResponse,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    

    if (error.message.includes('API_KEY')) {
      return res.status(500).json({
        error: 'AI service authentication failed. Please contact support.'
      });
    }
    
    if (error.message.includes('quota') || error.message.includes('limit')) {
      return res.status(429).json({
        error: 'AI service is temporarily busy. Please try again in a moment.'
      });
    }
    
    res.status(500).json({
      error: 'Sorry, I encountered an issue. Please try again.',
      fallback: getFallbackResponse(req.body.message)
    });
  }
});


app.get('/api/chat/history/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  const session = chatSessions.get(sessionId);
  
  if (!session) {
    return res.json({
      success: true,
      messages: [],
      sessionId: sessionId
    });
  }
  
  res.json({
    success: true,
    messages: session.messages,
    sessionId: sessionId,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity
  });
});


app.get('/embed.js', (req, res) => {
  const configId = req.query.config || 'default';
  const serverUrl = `${req.protocol}://${req.get('host')}`;
  
  const embedScript = `
(function() {
  'use strict';
  
  const CONFIG_ID = '${configId}';
  const SERVER_URL = '${serverUrl}';
  

  fetch(SERVER_URL + '/api/widget/config/' + CONFIG_ID)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        loadChatWidget(data.config);
      } else {
        console.error('Failed to load chat widget configuration');
      }
    })
    .catch(error => {
      console.error('Chat widget error:', error);

      loadChatWidget({
        title: 'Chat with us!',
        welcomeMessage: 'Hi! How can I help you today?',
        theme: { primaryColor: '#667eea', secondaryColor: '#764ba2' }
      });
    });
  
  function loadChatWidget(config) {

    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = SERVER_URL + '/widget/chat-widget.css';
    document.head.appendChild(css);
    

    const script = document.createElement('script');
    script.src = SERVER_URL + '/widget/enhanced-chat-widget.js';
    script.onload = function() {
      if (window.ChatWidget) {
        window.chatWidget = new window.ChatWidget({
          ...config,
          apiUrl: SERVER_URL + '/api'
        });
      }
    };
    document.head.appendChild(script);
  }
})();
`;
  
  res.setHeader('Content-Type', 'application/javascript');
  res.send(embedScript);
});


function getFallbackResponse(message) {
  const fallbackResponses = [
    "I apologize, but I'm having trouble connecting to my knowledge base right now. Could you please try again?",
    "I'm experiencing some technical difficulties. Is there a specific way I can help you?",
    "Sorry for the inconvenience! While I resolve this issue, is there something urgent I can assist with?",
    "I'm temporarily unavailable, but I'd be happy to help you shortly. Please try again in a moment."
  ];
  
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
}


app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});


app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path
  });
});


app.listen(PORT, () => {
  console.log(`🤖 Embeddable Chatbot Server running on port ${PORT}`);
  console.log(`📱 Widget embed URL: http://localhost:${PORT}/embed.js`);
  console.log(`🔧 Health check: http://localhost:${PORT}/api/health`);
  
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  WARNING: GEMINI_API_KEY not configured. Chat will use fallback responses.');
    console.log('   Get your API key from: https://makersuite.google.com/app/apikey');
  }
});


process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
