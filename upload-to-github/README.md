# Embeddable Chatbot

A simple chatbot widget for websites.

## What it does

- Adds a chat bubble to any website
- Users click to open chat window
- Uses Google Gemini AI for smart responses
- Customizable colors, position, messages

## How to add to your website

### 1. Add the script
```html
<script src="https://your-domain.com/widget/embeddable-chatbot.js"></script>
```

### 2. Configure it
```html
<script>
window.EMBEDDABLE_CHATBOT_CONFIG = {
    title: 'Chat Assistant',
    welcomeMessage: 'Hi! How can I help you today?',
    primaryColor: '#667eea',
    position: 'bottom-right'
};
</script>
```

### 3. That's it!
The chatbot will show up on your website.

## Setup

1. Run `npm install`
2. Copy `env.example` to `.env` and add your Google Gemini API key
3. Run `npm start`
4. Upload the `widget/` folder to your web server

## Try it out

Open `demo/index.html` to see it working.

## Get API key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Add it to `.env`

---

Done! 🚀
