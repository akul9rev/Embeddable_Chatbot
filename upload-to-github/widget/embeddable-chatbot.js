(function() {
    'use strict';

    const DEFAULT_CONFIG = {
        title: 'Chat Assistant',
        welcomeMessage: 'Hi! How can I help you today?',
        placeholder: 'Type your message...',
        position: 'bottom-right',
        
        width: 380,
        height: 500,
        borderRadius: 12,
        
        primaryColor: '#1a1a1a',
        secondaryColor: '#2a2a2a',
        textColor: '#e6e6e6',
        backgroundColor: '#000000',
        headerTextColor: '#e5e7eb',
        userBubbleColor: null,
        botBubbleColor: '#0a0a0a',
        inputBorderColor: '#1f1f1f',
        theme: 'dark',
        
        showTypingIndicator: true,
        showTimestamps: true,
        maxMessages: 50,
        autoExpand: false,
        
        apiUrl: window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/api' 
            : 'https://your-domain.com/api',
        
        onMessageSent: null,
        onMessageReceived: null,
        onWidgetOpen: null,
        onWidgetClose: null
    };

    class EmbeddableChatbot {
        constructor(config = {}) {
            this.config = { ...DEFAULT_CONFIG, ...config };
            this.isOpen = false;
            this.messages = [];
            this.sessionId = this.generateSessionId();
            this.typingTimeout = null;
            
            this.init();
        }

        init() {
            this.createWidget();
            this.bindEvents();
            this.addWelcomeMessage();
            
            if (this.config.autoExpand) {
                setTimeout(() => this.toggle(), 500);
            }
        }

        createWidget() {
            const container = document.createElement('div');
            container.id = 'embeddable-chatbot-container';
            container.innerHTML = this.getWidgetHTML();
            
            document.body.appendChild(container);
            
            this.bubble = document.getElementById('chat-bubble');
            this.chatWindow = document.getElementById('chat-window');
            this.closeBtn = document.getElementById('chat-close');
            this.input = document.getElementById('chat-input');
            this.sendBtn = document.getElementById('chat-send');
            this.messagesContainer = document.getElementById('chat-messages');
            this.typingIndicator = document.getElementById('typing-indicator');
            
            this.applyCustomStyles();
        }

        getWidgetHTML() {
            const { title, welcomeMessage, placeholder, width, height, borderRadius } = this.config;
            
            return `
                <!-- Chat Bubble -->
                <div id="chat-bubble" style="
                    position: fixed;
                    ${this.getPositionStyles()}
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.secondaryColor} 100%);
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
                    z-index: 10000;
                    transition: transform 0.3s ease;
                ">
                    <span id="chat-bubble-icon" style="color: white; font-size: 22px; filter: drop-shadow(0 0 6px rgba(255,255,255,0.35));">✦</span>
                </div>
                
                <!-- Chat Window -->
                <div id="chat-window" style="
                    position: fixed;
                    ${this.getPositionStyles()}
                    width: ${width}px;
                    height: ${height}px;
                    background: ${this.config.backgroundColor};
                    border-radius: ${borderRadius}px;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
                    display: none;
                    flex-direction: column;
                    z-index: 10000;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    overflow: hidden;
                    max-height: 90vh;
                ">
                                    <!-- Header -->
                <div class="chat-header" style="
                    background: linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.secondaryColor} 100%);
                    color: ${this.config.headerTextColor};
                    padding: 16px 20px;
                    border-radius: ${borderRadius}px ${borderRadius}px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-weight: 600;
                    flex-shrink: 0;
                    position: relative;
                    z-index: 2;
                ">
                    <span>${title}</span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button id="chat-settings" style="
                            background: none;
                            border: none;
                            color: ${this.config.headerTextColor};
                            font-size: 16px;
                            cursor: pointer;
                            padding: 4px;
                            border-radius: 4px;
                            transition: background-color 0.2s;
                        " title="Customize">⚙️</button>
                        <button id="chat-close" style="
                            background: none;
                            border: none;
                            color: ${this.config.headerTextColor};
                            font-size: 20px;
                            cursor: pointer;
                            padding: 0;
                            width: 24px;
                            height: 24px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">×</button>
                    </div>
                </div>
                
                <!-- Settings Panel (Hidden by default) -->
                <div id="chat-settings-panel" style="
                    display: none;
                    background: rgba(17, 24, 39, 0.95);
                    padding: 16px;
                    border-bottom: 1px solid #243041;
                    flex-shrink: 0;
                ">
                    <h4 style="margin: 0 0 16px 0; color: #e5e7eb; font-size: 14px;">Customize Chat</h4>
                                         <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px;">
                         <div>
                             <label style="display: block; margin-bottom: 4px; color: #9ca3af;">Primary Color:</label>
                             <input type="color" id="widget-primary-color" value="${this.config.primaryColor}" style="width: 100%; height: 30px; border: 1px solid #374151; background:#111827; border-radius: 4px;">
                         </div>
                         <div>
                             <label style="display: block; margin-bottom: 4px; color: #9ca3af;">Secondary Color:</label>
                             <input type="color" id="widget-secondary-color" value="${this.config.secondaryColor}" style="width: 100%; height: 30px; border: 1px solid #374151; background:#111827; border-radius: 4px;">
                         </div>
                         <div>
                             <label style="display: block; margin-bottom: 4px; color: #9ca3af;">Background Color:</label>
                             <input type="color" id="widget-background-color" value="${this.config.backgroundColor}" style="width: 100%; height: 30px; border: 1px solid #374151; background:#111827; border-radius: 4px;">
                         </div>
                         <div>
                             <label style="display: block; margin-bottom: 4px; color: #9ca3af;">Position:</label>
                             <select id="widget-position" style="width: 100%; height: 30px; border: 1px solid #374151; background:#111827; color:#e5e7eb; border-radius: 4px; font-size: 12px;">
                                 <option value="bottom-right" ${this.config.position === 'bottom-right' ? 'selected' : ''}>Bottom Right</option>
                                 <option value="bottom-left" ${this.config.position === 'bottom-left' ? 'selected' : ''}>Bottom Left</option>
                                 <option value="top-right" ${this.config.position === 'top-right' ? 'selected' : ''}>Top Right</option>
                                 <option value="top-left" ${this.config.position === 'top-left' ? 'selected' : ''}>Top Left</option>
                             </select>
                         </div>
                         <div>
                             <label style="display: block; margin-bottom: 4px; color: #9ca3af;">Title:</label>
                             <input type="text" id="widget-title" value="${this.config.title}" style="width: 100%; height: 30px; border: 1px solid #374151; background:#111827; color:#e5e7eb; border-radius: 4px; font-size: 12px; padding: 0 8px;">
                         </div>
                         
                         <div>
                             <label style="display: block; margin-bottom: 4px; color: #9ca3af;">Width (px):</label>
                             <input type="number" id="widget-width" value="${width}" min="300" max="500" style="width: 100%; height: 30px; border: 1px solid #374151; background:#111827; color:#e5e7eb; border-radius: 4px; font-size: 12px; padding: 0 8px;">
                         </div>
                         <div>
                             <label style="display: block; margin-bottom: 4px; color: #9ca3af;">Height (px):</label>
                             <input type="number" id="widget-height" value="${height}" min="380" max="700" style="width: 100%; height: 30px; border: 1px solid #374151; background:#111827; color:#e5e7eb; border-radius: 4px; font-size: 12px; padding: 0 8px;">
                         </div>
                         <div>
                             <label style="display: block; margin-bottom: 4px; color: #9ca3af;">Radius (px):</label>
                             <input type="number" id="widget-radius" value="${borderRadius}" min="8" max="24" style="width: 100%; height: 30px; border: 1px solid #374151; background:#111827; color:#e5e7eb; border-radius: 4px; font-size: 12px; padding: 0 8px;">
                         </div>
                     </div>
                    <div style="margin-top: 16px; text-align: center;">
                        <button id="widget-apply-settings" style="
                            background: linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.secondaryColor} 100%);
                            border: none;
                            color: white;
                            padding: 8px 16px;
                            border-radius: 20px;
                            cursor: pointer;
                            font-size: 12px;
                            font-weight: 600;
                        ">Apply Changes</button>
                    </div>
                </div>
                    
                    <!-- Messages -->
                    <div id="chat-messages" style="
                        flex: 1;
                        overflow-y: auto;
                        padding: 16px;
                        background: ${this.config.backgroundColor};
                        min-height: 0;
                        max-height: calc(${height}px - 200px);
                    ">
                        <!-- Messages will be added here -->
                    </div>
                    
                    <!-- Typing Indicator -->
                    <div id="typing-indicator" style="
                        display: none;
                        padding: 8px 16px;
                        color: #9ca3af;
                        font-style: italic;
                        font-size: 14px;
                        flex-shrink: 0;
                    ">
                        Bot is typing...
                    </div>
                    
                    <!-- Input Area -->
                    <div style="
                        padding: 16px;
                        border-top: 1px solid ${this.config.inputBorderColor};
                        display: flex;
                        gap: 8px;
                        background: ${this.config.backgroundColor};
                        border-radius: 0 0 ${borderRadius}px ${borderRadius}px;
                        flex-shrink: 0;
                    ">
                        <input type="text" id="chat-input" placeholder="${placeholder}" style="
                            flex: 1;
                            border: 1px solid ${this.config.inputBorderColor};
                            border-radius: 20px;
                            padding: 10px 16px;
                            outline: none;
                            font-size: 14px;
                            color: ${this.config.textColor};
                            background: #0a0a0a;
                        ">
                        <button id="chat-send" style="
                            background: linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.secondaryColor} 100%);
                            border: none;
                            border-radius: 50%;
                            width: 40px;
                            height: 40px;
                            color: white;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 16px;
                        ">➤</button>
                    </div>
                </div>
            `;
        }

        getPositionStyles() {
            const { position } = this.config;
            switch (position) {
                case 'bottom-left':
                    return 'bottom: 20px; left: 20px;';
                case 'top-right':
                    return 'top: 20px; right: 20px;';
                case 'top-left':
                    return 'top: 20px; left: 20px;';
                default:
                    return 'bottom: 20px; right: 20px;';
            }
        }

        applyCustomStyles() {
            if (this.config.width < 300) {
                this.chatWindow.style.width = '300px';
            }
        }
        
        updateColors() {
            const header = this.chatWindow.querySelector('#chat-settings').closest('div');
            if (header) {
                header.style.background = `linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.secondaryColor} 100%)`;
            }
            
            if (this.bubble) {
                this.bubble.style.background = `linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.secondaryColor} 100%)`;
            }
            
            if (this.sendBtn) {
                this.sendBtn.style.background = `linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.secondaryColor} 100%)`;
            }
            
            if (this.chatWindow) {
                this.chatWindow.style.background = this.config.backgroundColor;
            }
            
            if (this.messagesContainer) {
                this.messagesContainer.style.background = this.config.backgroundColor;
            }
            
            const inputArea = this.chatWindow.querySelector('div:last-child');
            if (inputArea) {
                inputArea.style.background = this.config.backgroundColor;
            }
        }
        
        updatePosition() {
            const position = this.config.position;
            let styles = '';
            
            switch (position) {
                case 'bottom-left':
                    styles = 'bottom: 20px; left: 20px;';
                    break;
                case 'top-right':
                    styles = 'top: 20px; right: 20px;';
                    break;
                case 'top-left':
                    styles = 'top: 20px; left: 20px;';
                    break;
                default:
                    styles = 'bottom: 20px; right: 20px;';
            }
            
            this.chatWindow.style.cssText = this.chatWindow.style.cssText.replace(
                /(bottom|top|left|right):\s*\d+px;/g, ''
            ) + styles;
            
            this.bubble.style.cssText = this.bubble.style.cssText.replace(
                /(bottom|top|left|right):\s*\d+px;/g, ''
            ) + styles;
        }

        bindEvents() {
            this.bubble.addEventListener('click', () => this.toggle());
            this.closeBtn.addEventListener('click', () => this.toggle());
            this.sendBtn.addEventListener('click', () => this.sendMessage());
            
            this.settingsBtn = document.getElementById('chat-settings');
            this.settingsPanel = document.getElementById('chat-settings-panel');
            this.settingsBtn.addEventListener('click', () => this.toggleSettings());
            
            this.applySettingsBtn = document.getElementById('widget-apply-settings');
            this.applySettingsBtn.addEventListener('click', () => this.applySettings());
            
            this.input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });

            document.addEventListener('click', (e) => {
                if (this.isOpen && 
                    !this.chatWindow.contains(e.target) && 
                    !this.bubble.contains(e.target)) {
                    this.toggle();
                }
            });
        }

        toggle() {
            this.isOpen = !this.isOpen;
            
            if (this.isOpen) {
                this.chatWindow.style.display = 'flex';
                this.bubble.style.display = 'none';
                this.input.focus();
                
                if (this.config.onWidgetOpen) {
                    this.config.onWidgetOpen();
                }
            } else {
                this.chatWindow.style.display = 'none';
                this.bubble.style.display = 'flex';
                
                if (this.config.onWidgetClose) {
                    this.config.onWidgetClose();
                }
            }
        }

        async sendMessage() {
            const message = this.input.value.trim();
            if (!message) return;

            this.input.value = '';

            this.addMessage('user', message);

            if (this.config.showTypingIndicator) {
                this.typingStartTime = Date.now();
                this.showTypingIndicator();
            }

            try {
                const response = await this.sendToAPI(message);
                
                const minTypingTime = 300;
                const elapsed = Date.now() - this.typingStartTime;
                if (elapsed < minTypingTime) {
                    await new Promise(resolve => setTimeout(resolve, minTypingTime - elapsed));
                }
                
                this.addMessage('bot', response);
                
                if (this.config.onMessageReceived) {
                    this.config.onMessageReceived(response);
                }
            } catch (error) {
                console.error('Chat API error:', error);
                this.addMessage('bot', 'Sorry, I encountered an error. Please try again.');
            }

            this.hideTypingIndicator();
        }

        async sendToAPI(message) {
            try {
                const response = await fetch(`${this.config.apiUrl}/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: message,
                        sessionId: this.sessionId
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                if (data.success) {
                    return data.response;
                } else {
                    throw new Error(data.error || 'Unknown error');
                }
            } catch (error) {
                return this.getFallbackResponse(message);
            }
        }

        getFallbackResponse(message) {
            const responses = [
                "Hello! How can I help you today?",
                "That's interesting! Tell me more about that.",
                "I understand. What else can I assist you with?",
                "Thanks for your message! Is there anything specific you'd like to know?",
                "Great question! Let me think about that for a moment.",
                "I'm here to help! What would you like to discuss?",
                "That's a good point. Can you elaborate a bit more?",
                "I appreciate you reaching out. How can I be of assistance?"
            ];
            
            return responses[Math.floor(Math.random() * responses.length)];
        }

        addMessage(role, content) {
            const message = {
                role,
                content,
                timestamp: new Date(),
                id: Date.now()
            };

            this.messages.push(message);

            if (this.messages.length > this.config.maxMessages) {
                this.messages.shift();
            }

            const messageEl = this.createMessageElement(message);
            this.messagesContainer.appendChild(messageEl);

            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

            if (role === 'user' && this.config.onMessageSent) {
                this.config.onMessageSent(content);
            }
        }

        createMessageElement(message) {
            const { role, content, timestamp } = message;
            const isUser = role === 'user';
            
            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = `
                display: flex;
                justify-content: ${isUser ? 'flex-end' : 'flex-start'};
                margin-bottom: 12px;
            `;

            const bubbleDiv = document.createElement('div');
            bubbleDiv.style.cssText = `
                background: ${isUser 
                    ? (this.config.userBubbleColor || this.config.primaryColor)
                    : this.config.botBubbleColor};
                color: ${isUser ? 'white' : this.config.textColor};
                padding: 10px 14px;
                border-radius: 16px;
                border-bottom-${isUser ? 'right' : 'left'}-radius: 4px;
                max-width: 80%;
                word-wrap: break-word;
                font-size: 14px;
                line-height: 1.4;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            `;

            bubbleDiv.textContent = content;

            if (this.config.showTimestamps) {
                const timeDiv = document.createElement('div');
                timeDiv.style.cssText = `
                    font-size: 11px;
                    color: #999;
                    margin-top: 4px;
                    text-align: ${isUser ? 'right' : 'left'};
                `;
                timeDiv.textContent = timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                bubbleDiv.appendChild(timeDiv);
            }

            messageDiv.appendChild(bubbleDiv);
            return messageDiv;
        }

        addWelcomeMessage() {
            this.addMessage('bot', this.config.welcomeMessage);
        }

        showTypingIndicator() {
            if (this.typingIndicator) {
                this.typingIndicator.style.display = 'block';
                this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            }
        }

        hideTypingIndicator() {
            if (this.typingIndicator) {
                this.typingIndicator.style.display = 'none';
            }
        }

        generateSessionId() {
            return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }


        open() {
            if (!this.isOpen) this.toggle();
        }

        close() {
            if (this.isOpen) this.toggle();
        }

        isWidgetOpen() {
            return this.isOpen;
        }

        updateConfig(newConfig) {
            this.config = { ...this.config, ...newConfig };
            
            if (newConfig.title) {
                const titleSpan = this.chatWindow.querySelector('#chat-settings').parentElement.previousElementSibling;
                if (titleSpan) titleSpan.textContent = newConfig.title;
            }
            
            if (newConfig.primaryColor || newConfig.secondaryColor || newConfig.backgroundColor) {
                this.updateColors();
            }
            
            if (newConfig.position) {
                this.updatePosition();
            }
            
            this.applyCustomStyles();
        }

        clearMessages() {
            this.messages = [];
            this.messagesContainer.innerHTML = '';
            this.addWelcomeMessage();
        }

        toggleSettings() {
            if (this.settingsPanel.style.display === 'none') {
                this.settingsPanel.style.display = 'block';
            } else {
                this.settingsPanel.style.display = 'none';
            }
        }
        
        applySettings() {
            const newConfig = {
                primaryColor: document.getElementById('widget-primary-color').value,
                secondaryColor: document.getElementById('widget-secondary-color').value,
                backgroundColor: document.getElementById('widget-background-color').value,
                position: document.getElementById('widget-position').value,
                title: document.getElementById('widget-title').value,
                width: document.getElementById('widget-width').value,
                height: document.getElementById('widget-height').value,
                borderRadius: document.getElementById('widget-radius').value
            };
            
            this.updateConfig(newConfig);
            this.toggleSettings();
        }
        
        destroy() {
            const container = document.getElementById('embeddable-chatbot-container');
            if (container) {
                container.remove();
            }
        }
    }

    window.EmbeddableChatbot = EmbeddableChatbot;

    if (window.EMBEDDABLE_CHATBOT_CONFIG) {
        window.chatbot = new EmbeddableChatbot(window.EMBEDDABLE_CHATBOT_CONFIG);
    }

})(); 