# Audio Recording Feature

This document describes the implementation of the audio recording feature in the chat application.

## Overview

The audio recording feature allows users to:
1. Record audio messages using their microphone
2. See a real-time waveform visualization during recording
3. Transcribe the audio using OpenAI Whisper
4. Send the transcribed text as a chat message
5. Get an AI response to the transcribed message

## Components

### 1. AudioRecorder Component (`apps/chat/app/components/chat/AudioRecorder.tsx`)
- Main component for audio recording interface
- Includes recording controls (start, stop, pause, resume)
- Shows recording status and duration
- Displays waveform visualization during recording
- Handles transcription via API
- Provides audio playback and download options

### 2. AudioWaveform Component (`apps/chat/app/components/chat/AudioWaveform.tsx`)
- Real-time waveform visualization using Web Audio API
- Shows frequency data as animated bars
- Uses gradient colors (red, orange, yellow) for visual appeal
- Responsive canvas that adapts to container size

### 3. useAudioRecorder Hook (`apps/chat/app/lib/hooks/use-audio-recorder.ts`)
- Manages audio recording state and logic
- Handles MediaRecorder API interactions
- Provides recording controls (start, stop, pause, resume)
- Manages audio stream for waveform visualization
- Handles error states and browser compatibility

### 4. AudioPlayer Component (`apps/chat/app/components/chat/AudioPlayer.tsx`)
- Audio playback interface for recorded audio
- Includes play/pause, seek, volume controls
- Shows progress bar and time display
- Supports download functionality

## API Endpoints

### Transcription API (`apps/chat/app/routes/api.transcribe.ts`)
- **POST** `/api/transcribe`
- Accepts audio file via FormData
- Uses OpenAI Whisper for transcription
- Returns structured transcription data with timestamps
- Supports multiple audio formats (WebM, MP4, MP3, WAV, OGG)
- File size limit: 25MB

### Speech API (`apps/chat/app/routes/api.speech.ts`)
- **POST** `/api/speech`
- Text-to-speech using OpenAI TTS
- Supports multiple voices and speeds
- Stores generated audio files in Supabase

## Integration with Chat

### ChatInput Component
- Includes microphone button to open audio recorder modal
- Handles transcribed text by sending it as a chat message
- Integrates with existing message sending flow

### ChatModals Component
- Manages audio recorder modal display
- Handles modal state and callbacks

## User Flow

1. **Start Recording**: User clicks microphone button → Opens audio recorder modal
2. **Record Audio**: User clicks record button → Starts recording with waveform visualization
3. **Stop Recording**: User clicks stop button → Stops recording and starts transcription
4. **Review**: User can play back recording and review transcription
5. **Send**: User clicks "Send Recording" → Transcribed text is sent as chat message
6. **AI Response**: System generates and displays AI response to the transcribed message

## Technical Details

### Audio Format
- Recording format: `audio/webm;codecs=opus`
- Sample rate: 44.1kHz
- Audio settings: echo cancellation, noise suppression, auto gain control

### Waveform Visualization
- Uses Web Audio API's AnalyserNode
- FFT size: 256 for smooth visualization
- Updates at 60fps using requestAnimationFrame
- Responsive canvas with device pixel ratio support

### Browser Support
- Requires HTTPS for microphone access
- Supports modern browsers with MediaRecorder API
- Graceful fallback for unsupported browsers

### Error Handling
- Microphone permission errors
- Browser compatibility issues
- Transcription API errors
- File size and format validation

## Security Considerations

- Audio files are processed server-side for transcription
- No audio data is stored permanently (only during processing)
- Transcription API calls are rate-limited
- File size limits prevent abuse

## Future Enhancements

- Voice activity detection for automatic recording start/stop
- Multiple language transcription support
- Audio quality settings
- Background noise reduction
- Real-time transcription during recording
- Audio message playback in chat history 
