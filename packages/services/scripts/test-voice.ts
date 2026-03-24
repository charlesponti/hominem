#!/usr/bin/env bun
/**
 * Manual integration test for voice services
 * 
 * Run with: SAVE_VOICE_AUDIO=true bun packages/services/scripts/test-voice.ts
 */

// Load environment FIRST - must happen before any service imports
import { config } from 'dotenv'
config({ path: '../../services/api/.env' })

// Now import services (they will read from process.env)
const { generateVoiceResponse } = await import('../src/voice-response.service')
const { transcribeVoiceBuffer } = await import('../src/voice-transcription.service')

import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'

console.log('🔊 Voice Services Integration Test\n')
console.log('Environment: SAVE_VOICE_AUDIO =', process.env.SAVE_VOICE_AUDIO || 'false')
console.log('API Key present:', !!process.env.OPENROUTER_API_KEY)
console.log('Audio files will be saved to: .tmp/voice/\n')

async function testTranscription() {
  console.log('📤 TEST 1: Transcription (Gemini 2.5 Flash Lite)')
  console.log('   Using sample audio from Wikipedia...')
  
  try {
    // Download sample if not exists
    const samplePath = '/tmp/test-audio.ogg'
    let audioBuffer: Buffer
    
    try {
      audioBuffer = readFileSync(samplePath)
    } catch {
      console.log('   Downloading sample audio...')
      const response = await fetch('https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg')
      audioBuffer = Buffer.from(await response.arrayBuffer())
      await Bun.write(samplePath, audioBuffer)
    }
    
    console.log(`   Input: ${audioBuffer.length} bytes OGG audio`)
    
    const result = await transcribeVoiceBuffer({
      buffer: audioBuffer,
      mimeType: 'audio/ogg',
      fileName: 'test-audio.ogg',
    })
    
    console.log('✅ Transcription successful!')
    console.log('   Text:', result.text.substring(0, 100))
    if (result.savedPath) {
      console.log('   💾 Saved to:', result.savedPath)
    }
    return result.text
  } catch (error) {
    console.error('❌ Transcription failed:', error instanceof Error ? error.message : error)
    return 'Hello, this is a test message'
  }
}

async function testVoiceResponse(userText: string) {
  console.log('\n📤 TEST 2: Voice Response (GPT-4o Audio Preview)')
  console.log(`   Input: "${userText.substring(0, 60)}${userText.length > 60 ? '...' : ''}"`)
  
  try {
    const result = await generateVoiceResponse({
      text: userText,
      voice: 'alloy',
      format: 'pcm16',
    })
    
    console.log('✅ Voice response generated!')
    console.log('   Audio size:', result.audioBuffer.length, 'bytes', `(${Math.round(result.audioBuffer.length / 1024)} KB)`)
    console.log('   MIME type:', result.mimeType)
    console.log('   AI says:', result.transcript.substring(0, 100))
    if (result.savedPath) {
      console.log('   💾 Saved to:', result.savedPath)
    }
    
    return result
  } catch (error) {
    console.error('❌ Voice response failed:', error instanceof Error ? error.message : error)
    throw error
  }
}

async function testEndToEnd() {
  console.log('\n📤 TEST 3: End-to-End Flow (Transcribe → Respond)')
  
  try {
    const samplePath = '/tmp/test-audio.ogg'
    let audioBuffer: Buffer
    
    try {
      audioBuffer = readFileSync(samplePath)
    } catch {
      const response = await fetch('https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg')
      audioBuffer = Buffer.from(await response.arrayBuffer())
    }
    
    console.log(`   Step 1: Transcribing ${audioBuffer.length} bytes...`)
    const transcription = await transcribeVoiceBuffer({
      buffer: audioBuffer,
      mimeType: 'audio/ogg',
    })
    console.log('   User said:', transcription.text.substring(0, 80))
    
    console.log('   Step 2: Generating AI response...')
    const response = await generateVoiceResponse({
      text: transcription.text,
      voice: 'alloy',
      format: 'pcm16',
    })
    
    console.log('   AI responded!')
    console.log('   Response:', response.transcript.substring(0, 80))
    console.log('   Audio:', Math.round(response.audioBuffer.length / 1024), 'KB')
    if (response.savedPath) {
      console.log('   💾 Output saved to:', response.savedPath)
    }
    
  } catch (error) {
    console.error('❌ End-to-end test failed:', error instanceof Error ? error.message : error)
  }
}

async function main() {
  const transcribedText = await testTranscription()
  await testVoiceResponse(transcribedText)
  await testEndToEnd()
  
  console.log('\n✨ All tests complete!')
  console.log('\n📝 Check logs above for detailed request/response timing')
  console.log('💾 Audio files saved in: .tmp/voice/')
}

main().catch(console.error)
