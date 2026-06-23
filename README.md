# Hacko AI

An AI chat platform featuring multi-LLM support, voice interaction, RAG, and automated message classification.

## Tech Stack

### Frontend
React 19, TypeScript, Vite, Socket.IO, Web Speech API

### Backend
Node.js, Express, TypeScript, Socket.IO, OpenAI SDK, Anthropic SDK, SQLite

## Core Features

* **Streaming Multi-LLM Chat:** Seamless interaction with OpenAI, Anthropic, Groq, OpenRouter, and Ollama.
* **Voice Interaction:** Native voice input and automated speech synthesis for model responses.
* **Document Analysis (RAG):** Document upload and processing support for PDF, DOC, DOCX, and TXT via Retrieval-Augmented Generation.
* **Specialized AI Agents:** Dedicated presets for Support, Developer, and Assistant roles.
* **Automated Classification:** Smart message processing with automated ticket creation.
* **Telegram Bot Integration:** A fully functional AI assistant within Telegram featuring:
  * Automatic user registration upon the first message.
  * Direct chat interaction with the AI.
  * Command support: /start, /help, /clear, /agent [name].
  * Persistent chat history synchronization.
* **Authentication:** Multi-channel login via SMS, Email, and Telegram.
* **UI/UX:** Native dark/light mode toggle and full multilingual support (RU/EN).

## Quick Start

### Backend Installation
```bash
cd backend
npm install
cp env.example .env
npm run dev
```

### Frontend Installation
```bash
cd ../frontend
npm install
npm run dev
```
Once started, navigate to http://localhost:5173

## API Key Configuration

Create a `backend/.env` file and provide at least one valid API key:

```env
OPENROUTER_API_KEY=your_key
# or
GROQ_API_KEY=your_key
# or
OPENAI_API_KEY=your_key
```

## Telegram Bot Setup (Optional)

1. Contact @BotFather on Telegram.
2. Send the `/newbot` command and follow the configuration steps.
3. Copy the generated HTTP API token (e.g., `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`).
4. Append the token to your `backend/.env` file: `TELEGRAM_BOT_TOKEN=your_token`
5. Restart the backend service.
6. Open your bot in Telegram and send the `/start` command.

Note: The bot runs locally using long polling mechanism. No public URL or webhook configuration is required.

For comprehensive configuration guidelines, please refer to `backend/env.example`.
