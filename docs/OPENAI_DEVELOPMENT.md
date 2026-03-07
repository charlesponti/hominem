# OpenAI Development Setup - Ready to Test

## 🚀 Status: READY FOR DEVELOPMENT

Your OpenAI client is fully configured and ready to test. No additional setup needed.

## ✅ What's Configured

### 1. **API Key** ✓
   - Location: `services/api/.env`
   - Key: `OPENAI_API_KEY=sk-proj-...`
   - Status: Active and loaded

### 2. **AI SDK Package** ✓
   - Package: `@ai-sdk/openai@1.3.22`
   - Installed in: `packages/hono-rpc`, `packages/services`, `services/api`
   - Status: Ready to use

### 3. **Endpoints Configured** ✓
   - `/api/mobile/voice/transcribe` → OpenAI Whisper API
   - `/api/mobile/intents/derive` → OpenAI GPT-4o
   - Status: Both endpoints use OpenAI

### 4. **Environment Validation** ✓
   - Schema validates `OPENAI_API_KEY`
   - Fallback: `'test-openai-key'` for tests
   - Production: Real API key required

## 🧪 How to Test

### Option 1: Test the API Directly

```bash
# Terminal 1: Start the API server
cd services/api
bun run dev
# Server runs on http://localhost:4040

# Terminal 2: Test voice transcription
# First, create a test audio file or use an existing one
curl -X POST http://localhost:4040/api/mobile/voice/transcribe \
  -F "audio=@path/to/audio.wav" \
  -H "Authorization: Bearer test-token"

# Expected response:
# {
#   "text": "transcribed text from audio",
#   "language": "en",
#   "duration": 5.2
# }
```

### Option 2: Test Through Mobile App

```bash
# Terminal 1: Start API server
cd services/api
bun run dev

# Terminal 2: Start mobile app
cd apps/mobile
bun run dev

# Then:
# 1. Open app in Expo Go or simulator
# 2. Navigate to chat (sherpa tab)
# 3. Press microphone button
# 4. Record audio
# 5. Watch transcription happen in real-time
# 6. Message auto-sends with transcribed text
```

### Option 3: Test Intent Derivation

```bash
curl -X POST http://localhost:4040/api/mobile/intents/derive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "content": "remind me to call mom tomorrow at 10am"
  }'

# Expected response with extracted intent:
# {
#   "version": "v1",
#   "output": "User wants to create a reminder",
#   "create": {
#     "output": [
#       {
#         "text": "call mom",
#         "due_date": "2026-03-08",
#         "priority": 1,
#         ...
#       }
#     ]
#   }
# }
```

## 📊 Monitoring OpenAI Usage

1. Go to: https://platform.openai.com/usage
2. Check real-time usage for:
   - Tokens consumed
   - API calls
   - Estimated costs
3. Monitor during testing to ensure everything works

## 🔍 Debugging

### If API key is not being picked up:

1. **Check file exists:**
   ```bash
   cat services/api/.env | grep OPENAI_API_KEY
   ```

2. **Verify environment is loaded:**
   ```bash
   cd services/api
   node -e "require('dotenv').config(); console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY?.slice(0, 10) + '...')"
   ```

3. **Check in running server:**
   ```bash
   # In services/api/src/env.ts, logs show what was loaded
   console.log(env.OPENAI_API_KEY)
   ```

### If transcription fails:

1. Check error logs for OpenAI API errors
2. Verify audio format is supported:
   - audio/webm ✓
   - audio/mp4 ✓
   - audio/mpeg ✓
   - audio/wav ✓
   - audio/ogg ✓

3. Check file size < 25MB limit

4. Verify API key has transcription permissions

### If chat responses are slow:

1. Check OpenAI API status: https://status.openai.com
2. Monitor token usage
3. Consider implementing request timeouts
4. Add response streaming for better UX

## 🎯 Development Workflow

```
1. Record voice in mobile app
   ↓
2. Audio sent to /api/mobile/voice/transcribe
   ↓
3. Transcribed by OpenAI Whisper API
   ↓
4. Text auto-sent as chat message
   ↓
5. LLM responds via chat endpoint (uses OpenAI gpt-4o)
   ↓
6. Response displayed in chat UI
```

## 💡 Pro Tips

1. **Use Chrome DevTools Network tab** to inspect API requests
2. **Enable API response logging:**
   ```typescript
   // In packages/hono-rpc/src/routes/mobile.ts
   console.log('Transcription request:', { size, mimeType })
   console.log('OpenAI response:', response)
   ```

3. **Test with different audio formats** to ensure robustness
4. **Monitor token usage** - GPT-4o is more expensive than GPT-4 Turbo
5. **Consider response caching** for repeated phrases

## ⚠️ Important Notes

- **API Key is sensitive:** Never commit to git or share publicly
- **Cost tracking:** Monitor usage to avoid unexpected bills
- **Rate limiting:** OpenAI has rate limits; cache when possible
- **Audio limitations:** Max 25MB, Whisper has accuracy considerations
- **Fallback available:** Can switch to LMStudio if needed (`getLMStudioAdapter()`)

## 🚦 Next Steps

1. ✅ OpenAI is configured
2. ✅ Environment variables are set
3. ✅ APIs are ready to use
4. 🎯 Start the API server: `cd services/api && bun run dev`
5. 🎯 Test voice input in mobile app
6. 🎯 Monitor usage and optimize as needed

## ❓ Questions?

Check:
- API Error Responses: `packages/hono-rpc/src/routes/mobile.ts:145`
- Voice Service: `packages/services/src/voice-transcription.service.ts`
- Environment Setup: `packages/hono-rpc/src/lib/env.ts`
- API Server: `services/api/src/server.ts`
