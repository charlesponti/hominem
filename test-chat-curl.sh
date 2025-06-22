#!/bin/bash

# Test script for the chat API endpoints
# This script tests the chat functionality without requiring authentication

# Configuration
BASE_URL="http://localhost:4446"  # Adjust this to your server URL
CHAT_STREAM_ENDPOINT="$BASE_URL/api/chat-stream"

echo "🧪 Testing Chat API Endpoints"
echo "=============================="
echo ""

# Test 1: Basic chat message
echo "📝 Test 1: Basic chat message"
echo "Sending: 'Hello, how are you?'"
echo ""

curl -X POST "$CHAT_STREAM_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "X-Rate-Limit-Bypass: test" \
  -d '{
    "message": "Hello, how are you?",
    "userId": "test-user-123",
    "createNewChat": true,
    "chatTitle": "Test Chat"
  }' \
  --no-buffer

echo ""
echo ""
echo "=============================="
echo ""

# Test 2: Chat with conversation history
echo "📝 Test 2: Chat with conversation history"
echo "Sending: 'What is the capital of France?'"
echo ""

curl -X POST "$CHAT_STREAM_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "X-Rate-Limit-Bypass: test" \
  -d '{
    "message": "What is the capital of France?",
    "userId": "test-user-123",
    "conversationHistory": [
      {"role": "user", "content": "Hello"},
      {"role": "assistant", "content": "Hi there! How can I help you today?"}
    ]
  }' \
  --no-buffer

echo ""
echo ""
echo "=============================="
echo ""

# Test 3: Chat with voice mode enabled
echo "📝 Test 3: Chat with voice mode enabled"
echo "Sending: 'Tell me a short joke'"
echo ""

curl -X POST "$CHAT_STREAM_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "X-Rate-Limit-Bypass: test" \
  -d '{
    "message": "Tell me a short joke",
    "userId": "test-user-123",
    "voiceMode": true
  }' \
  --no-buffer

echo ""
echo ""
echo "=============================="
echo ""

# Test 4: Chat with search context
echo "📝 Test 4: Chat with search context"
echo "Sending: 'What is this about?'"
echo ""

curl -X POST "$CHAT_STREAM_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "X-Rate-Limit-Bypass: test" \
  -d '{
    "message": "What is this about?",
    "userId": "test-user-123",
    "searchContext": "This is a test context about artificial intelligence and machine learning."
  }' \
  --no-buffer

echo ""
echo ""
echo "=============================="
echo ""

# Test 5: Anonymous user (no userId)
echo "📝 Test 5: Anonymous user"
echo "Sending: 'Hello anonymous'"
echo ""

curl -X POST "$CHAT_STREAM_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "X-Rate-Limit-Bypass: test" \
  -d '{
    "message": "Hello anonymous"
  }' \
  --no-buffer

echo ""
echo ""
echo "✅ All tests completed!"
echo ""
echo "Note: The responses are Server-Sent Events (SSE) streams."
echo "Each chunk contains JSON data with 'type', 'content', etc."
echo "Look for 'type: complete' to know when the response is finished."
echo ""
echo "Rate limiting has been bypassed using the X-Rate-Limit-Bypass header." 
