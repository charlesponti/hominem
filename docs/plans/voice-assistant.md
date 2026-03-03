# Voice Assistant Implementation Plan

## Executive Summary

This document outlines the implementation of a voice-first personal assistant feature for the Hominem mobile application. The feature consists of two distinct voice interaction modes:

1. **Voice Input Mode** - Inline voice recording that replaces the text input area with an animated waveform. User taps the microphone to toggle recording on/off. When recording stops, the audio is transcribed and sent as a text message to the AI chat.

2. **Voice Mode** - A full-screen conversational experience where the user can speak naturally with the AI assistant. AI responses are spoken aloud using on-device text-to-speech (TTS). When the user exits Voice Mode, all conversation is preserved as transcribed text in the chat history.

### Key Design Decisions

| Decision | Choice |
|----------|--------|
| Voice activation | Toggle (tap to start, tap to stop) |
| Waveform visualization | Simple animated bars occupying text input space |
| Voice Mode entry | Dedicated button next to microphone |
| Voice Mode exit | X button returns to chat with full transcription |
| TTS engine | On-device via expo-speech |
| Offline/Error fallback | Show error, offer text input fallback |
| Audio levels | Create new `useVoiceInput` hook with real-time metering, haptics, accessibility |
| Recording storage | Stream audio, do not record to file unless needed |
| Real-time subtitles | NOT in scope - will build later |
| App interruption | Recording ends immediately when app exits or phone call begins |
| Haptic feedback | Add for entering/exiting all modes and states |
| Message persistence | Store in local storage so users don't lose progress |
| Voice Mode context | Shares chat history with Text Mode |
| Text Mode vs Voice Mode | Text Mode = reading text messages, Voice Mode = speaking/listening |
| Screen Reader | Support required - announce state changes |
| Task creation | Create silently, show summary of how many tasks created |

---

## Detailed Design Decisions

### 1. Audio System Design (NEW)

**Requirement**: The audio system must be designed to expose real-time audio levels to the waveform visualization.

**Design Approach**:
- Use expo-av's built-in metering feature to get real-time audio levels
- Do NOT record to file unless explicitly needed for transcription
- Stream audio levels directly to waveform visualization
- Only create audio file when user stops recording and we need to transcribe

**Implementation**:
```typescript
// Best practice: Use expo-av metering for real-time audio levels
const { recording } = await Audio.Recording.createAsync({
  isMeteringEnabled: true,
  android: { extension: '.m4a' },
  ios: { extension: '.m4a' },
});

// Get real-time audio levels (0-1 range)
recording.setOnRecordingStatusUpdate((status) => {
  if (status.metering) {
    // Convert decibels to 0-1 range
    const level = convertDbToLevel(status.metering);
    onAudioLevelUpdate(level);
  }
});
```

**Benefits**:
- Real-time audio visualization with minimal latency
- No unnecessary file I/O during recording
- Battery efficient - metering is lightweight compared to file recording
- 60fps waveform updates possible

### 2. Waveform Visualization Best Practices

**Visual Design**:
```
Recording (active):
▂ ▃ ▅ ▇ ▅ ▃ ▂ ▃ ▅

Processing (transcribing):
▂ ▃ ▅ ▇ ▅ ▃ ▂ ▃ ▅ (slower animation)

Error:
▬ ▬ ▬ ▬ ▬ ▬ ▬ ▬ (static, red tint)
```

**Best Practices Applied**:
1. **Bar count**: 7 bars - provides good visual without being overwhelming
2. **Animation**: Sine wave pattern - natural, pleasing motion
3. **Responsiveness**: 60fps using react-native-reanimated
4. **Color coding**:
   - Recording: Primary brand color
   - Processing: Amber/waiting color
   - Error: Red tint
5. **Height variation**: Random but smoothed for natural look

### 3. App Interruption Handling

**Behaviors**:
| Event | Action |
|-------|--------|
| App backgrounded | Stop recording, discard audio, return to idle |
| Phone call begins | Stop recording, discard audio, return to idle |
| Screen locks | Stop recording, discard audio, return to idle |
| User switches apps | Stop recording, discard audio, return to idle |

**Implementation**:
```typescript
// Use AppState listener
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState !== 'active') {
      // Recording in progress - stop and discard
      if (recordingRef.current) {
        stopRecording(discard: true);
      }
    }
  });
  
  return () => subscription.remove();
}, []);
```

### 4. Haptic Feedback Specification

**Triggers and Feedback Types**:

| Action | Haptic Type | Intensity |
|--------|-------------|------------|
| Voice Input started | Impact | Medium |
| Voice Input stopped | Impact | Light |
| Voice Input cancelled | NotificationWarning | - |
| Voice Input error | NotificationError | - |
| Voice Mode entered | Impact | Heavy |
| Voice Mode exited | Impact | Medium |
| Task confirmation shown | Impact | Light |
| Task confirmed created | NotificationSuccess | - |
| TTS started | Selection | - |
| TTS interrupted | Impact | Light |

**Implementation**:
```typescript
import * as Haptics from 'expo-haptics';

function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') {
  switch (type) {
    case 'light':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'heavy':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'success':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'warning':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'error':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
  }
}
```

### 5. Local Storage Persistence

**Storage Strategy**:
- Use AsyncStorage for persistence
- Store Voice Mode session data separately
- Auto-restore on app reopen
- Clear after successful message sync

**Storage Keys**:
```typescript
const STORAGE_KEYS = {
  VOICE_MODE_SESSION: '@hominem/voice_mode_session',    // Current conversation
  VOICE_MODE_HISTORY: '@hominem/voice_mode_history',   // Last N conversations
};
```

**Data Structure**:
```typescript
interface VoiceModeSession {
  id: string;
  startedAt: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  lastActiveAt: string;
}
```

### 6. Voice Mode = Real-Time Chat Mode

**Concept**: Voice Mode is simply the real-time/voice-enabled mode of the existing chat. It's not a separate experience - it's the same chat, just with voice input/output instead of text.

**Implications**:
- Voice Mode and Text Mode share the same chat history
- Switching between modes preserves context
- Messages appear in both modes identically
- The only difference is input (voice vs text) and output (TTS vs text)

**State Sharing**:
```typescript
// Both modes access the same message store
const chatMessages = useChatMessages(); // Shared across modes
const voiceModeMessages = useVoiceModeMessages(); // Synced with chat
```

### 7. Task Creation Confirmation

**Flow**:
1. User speaks: "Remind me to call mom tomorrow"
2. Intent detected: Create task with due date
3. Show confirmation card:
```
┌─────────────────────────────────────┐
│  📝 Create Task?                   │
│                                     │
│  "Call mom"                        │
│  📅 Tomorrow at 9:00 AM            │
│                                     │
│  [Cancel]        [Confirm ✓]       │
└─────────────────────────────────────┘
```
4. User confirms → Task created
5. User can edit before confirming

**Confirmation Card Features**:
- Shows parsed task text
- Shows detected due date/category
- Editable fields
- Clear Accept/Cancel buttons

### 8. Screen Reader Support

**Announcements by State**:

| State | Announcement |
|-------|--------------|
| Recording started | "Recording started" |
| Recording stopped | "Recording stopped, transcribing" |
| Transcribing | "Transcribing" |
| Voice Mode entered | "Voice mode enabled" |
| Listening | "Listening" |
| Processing | "Processing response" |
| Speaking | "Speaking" |
| Voice Mode exited | "Voice mode disabled" |
| Task confirmation | "Task: [task text]. Due: [date]. Confirm?" |

**Implementation**:
```typescript
import { AccessibilityInfo } from 'react-native';

function announce(message: string) {
  AccessibilityInfo.announceForAccessibility(message);
}
```

---

## Updated State Machines

### Voice Input State Machine (with haptics)

```
┌─────────┐
│  IDLE   │◄────────────────────────────────────────┐
└────┬────┘                                           │
     │ tap mic                                        │ error
     │ (HAPTIC: medium impact)                        │
     ▼                                                │
┌─────────┐                                    ┌────────────┐
│RECORDING│ ─── tap mic ─────────────────────► │TRANSCRIBING│
│         │ (HAPTIC: light impact)            │            │
└────┬────┘                                    └─────┬──────┘
     │                                                │
     │ cancel                                         │ success
     │ (HAPTIC: warning)                             │ (HAPTIC: success)
     ▼                                                ▼
┌──────────┐                                    ┌──────────┐
│  ERROR   │                                    │  IDLE    │
│(HAPTIC:  │                                    │ (with    │
│ error)   │                                    │ text)    │
└──────────┘                                    └──────────┘
     │
     │ app background / phone call
     │ (HAPTIC: light impact)
     ▼
┌──────────┐
│  IDLE    │ (discard audio)
└──────────┘
```

### Voice Mode State Machine (with haptics)

```
┌─────────┐
│  IDLE   │◄────────────────────────────────────────┐
└────┬────┘                                           │
     │ enter Voice Mode                               │ tap X
     │ (HAPTIC: heavy impact)                         │ (HAPTIC: medium impact)
     ▼                                                 │
┌────────────┐                                        │
│GREETING   │ ─── TTS complete ─────────────────────┤
│(HAPTIC:   │                                        │
│ light)    │                                        │
└─────┬──────┘                                        │
      │                                               │
      ▼                                               │
┌───────────┐    tap mic                      ┌──────────┐
│LISTENING  │ ◄───────────────────────────► │PROCESSING│
│(HAPTIC:   │    (HAPTIC: medium)          │          │
│ light)    │                                └────┬─────┘
┴─────┬─────┘                                      │
      │ release mic                                  │ response ready
      │ (HAPTIC: light)                            │
      ▼                                              │
┌───────────┐    TTS playing                         │
│SPEAKING   │ ◄────────────────────────────────────┘
│(HAPTIC:   │
│ selection)│
└─────┬─────┘
      │
      │ TTS complete
      │ (HAPTIC: light)
      ▼
┌───────────┐
│  IDLE     │ (loop back to LISTENING)
└───────────┘
```

---

## User Experience Specification

### 1. Normal Chat Mode

The default state of the Sherpa (AI chat) screen:

```
┌─────────────────────────────────────────────────────────────────┐
│  ◀ Sherpa                                    [⋮]              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🤖 AI Assistant                                           │   │
│  │                                                          │   │
│  │ Hello! How can I help you today?                        │   │
│  │ 10:32 AM                                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ You                                                       │   │
│  │                                                          │   │
│  │ Help me plan my week                                    │   │
│  │ 10:33 AM                                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [🎤 Voice Input]              [🚀 Send]               │   │
│  │  Type a message...                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
- Message history (scrollable)
- Text input field
- Voice Input toggle button (microphone icon)
- Voice Mode button (rocket/assistant icon)
- Send button

### 2. Voice Input Mode (Inline Recording)

When user taps the microphone button, the text input is replaced with an animated waveform:

```
┌─────────────────────────────────────────────────────────────────┐
│  ◀ Sherpa                                    [⋮]              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🤖 AI Assistant                                           │   │
│  │                                                          │   │
│  │ Hello! How can I help you today?                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🎤 ▂ ▃ ▅ ▇ ▅ ▃ ▂ ▃ ▅ ▇ ▅ ▃ ▂ ▃ ▅               │   │
│  │                                                          │   │
│  │              Recording...                                 │   │
│  │                                                          │   │
│  │              [🗑️ Cancel]                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior:**
1. User taps microphone button
2. Text input transforms into waveform display
3. Recording starts immediately via expo-av
4. Animated bars show audio levels in real-time
5. User taps microphone again to stop
6. Audio is sent for transcription
7. Text input returns with transcribed text
8. User can edit or send the transcribed message

**States:**
- `idle` - Normal text input mode
- `recording` - Microphone active, waveform animated
- `transcribing` - Audio being processed to text
- `error` - Recording or transcription failed

### 3. Voice Mode (Full Screen)

When user taps the Voice Mode button, a full-screen conversational interface appears:

```
┌─────────────────────────────────────────────────────────────────┐
│                                              [✕] Close         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🤖 AI Assistant                                           │   │
│  │                                                          │   │
│  │ What would you like help with today?                    │   │
│  │                                                          │   │
│  │                    ▲                                      │   │
│  │                    │ (TTS playing)                       │   │
│  │                    │                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│                                                                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │              🎤 TAP TO SPEAK                            │   │
│  │                                                          │   │
│  │         ▂▃▅▇▅▃▂▃▅▇▅▃▂▃▅▇▅▃▂                         │   │
│  │                                                          │   │
│  │           (animated waveform)                            │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              [Exit Voice Mode]                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior:**
1. User taps Voice Mode button (rocket icon)
2. Full screen overlay/modal appears
3. AI speaks greeting via TTS
4. User taps to speak (toggle recording)
5. User releases to send
6. AI processes and responds
7. AI response is spoken via TTS
8. Conversation continues
9. User taps X to exit
10. All messages are added to chat as text

**States:**
- `idle` - Waiting for user to speak
- `listening` - User is recording
- `processing` - AI is generating response
- `speaking` - AI TTS is playing
- `error` - Something failed

### 4. Exit Voice Mode

When user taps X:

```
┌─────────────────────────────────────────────────────────────────┐
│  ◀ Sherpa                                    [⋮]              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🤖 AI Assistant                                           │   │
│  │ What would you like help with today?                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ You                                                       │   │
│  │ Help me plan my week                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🤖 AI Assistant                                           │   │
│  │                                                          │   │
│  │ I'd be happy to help you plan your week! Let me ask    │   │
│  │ a few questions to get started...                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [Text Input..........................] [🎤] [🚀]       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

All Voice Mode conversation is preserved as text in the chat history.

---

## Technical Architecture

### Component Hierarchy

```
apps/mobile/
├── app/
│   └── (drawer)/
│       └── (tabs)/
│           └── sherpa/
│               ├── index.tsx              # Main chat screen
│               └── voice-mode.tsx         # Full screen Voice Mode
├── components/
│   └── ai/                              # NEW: AI voice components
│       ├── AudioWaveform.tsx             # Animated bars visualization
│       ├── VoiceInputToggle.tsx          # Mic button + inline waveform
│       ├── VoiceModeButton.tsx           # Enter Voice Mode button
│       ├── VoiceModeScreen.tsx           # Full screen Voice Mode UI
│       └── VoiceModeMessage.tsx          # Message in Voice Mode
└── hooks/                                # NEW: Voice-related hooks
    ├── useVoiceInput.ts                  # Inline voice recording
    ├── useVoiceMode.ts                   # Voice Mode state management
    ├── useTextToSpeech.ts                # On-device TTS
    └── useVoiceIntentHandler.ts          # Voice → intent → action
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA FLOW                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  USER INTERACTION                                                │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    UI COMPONENTS                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │  │
│  │  │VoiceInput   │  │VoiceMode    │  │VoiceMode       │  │  │
│  │  │Toggle       │  │Button       │  │Screen          │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └───────┬────────┘  │  │
│  └─────────┼────────────────┼──────────────────┼────────────┘  │
│            │                │                  │               │
│            ▼                ▼                  ▼               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      HOOKS                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐ │  │
│  │  │useVoiceInput│  │useVoiceMode │  │useTextToSpeech │ │  │
│  │  └──────┬──────┘  └──────┬──────┘  └───────┬────────┘ │  │
│  └─────────┼────────────────┼──────────────────┼────────────┘  │
│            │                │                  │               │
│            ▼                ▼                  ▼               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   EXISTING MOBILE HOOKS                  │  │
│  │  ┌─────────────────────┐  ┌────────────────────────┐  │  │
│  │  │use-mobile-audio-    │  │use-get-user-intent.ts │  │  │
│  │  │recorder.ts          │  │                        │  │  │
│  │  └──────────┬──────────┘  └───────────┬────────────┘  │  │
│  └─────────────┼──────────────────────────┼────────────────┘  │
│                │                          │                    │
│                ▼                          ▼                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 NETWORK LAYER                             │  │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐   │  │
│  │  │ Transcription   │  │ Intent Derivation          │   │  │
│  │  │ API             │  │ API                        │   │  │
│  │  │                 │  │                             │   │  │
│  │  │ POST /api/      │  │ POST /api/mobile/intents   │   │  │
│  │  │ voice/transcribe│  │ /derive                   │   │  │
│  │  └─────────────────┘  └─────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 OFFLINE FALLBACK                         │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │  Text input fallback (show error, switch to text) │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### State Machines

#### Voice Input State Machine

```
┌─────────┐
│  IDLE   │◄────────────────────────────────────────┐
└────┬────┘                                           │
     │ tap mic                                        │ error
     ▼                                                │
┌─────────┐                                    ┌────────────┐
│RECORDING│ ─── tap mic (or auto-stop) ──────► │TRANSCRIBING│
└────┬────┘                                    └─────┬──────┘
     │                                                │
     │ cancel                                         │ success
     ▼                                                ▼
┌──────────┐                                    ┌──────────┐
│  ERROR   │                                    │  IDLE    │
└──────────┘                                    │ (with    │
     │                                           │ text)    │
     └───────────────────────────────────────────┘
```

#### Voice Mode State Machine

```
┌─────────┐
│  IDLE   │◄────────────────────────────────────────┐
└────┬────┘                                           │
     │ enter Voice Mode                               │ tap X
     ▼                                                │
┌────────────┐                                        │
│GREETING   │ ─── TTS complete ─────────────────────┤
└─────┬──────┘                                        │
      │                                               │
      ▼                                               │
┌───────────┐    tap mic                      ┌──────────┐
│LISTENING  │ ──────────────────────────────►  │PROCESSING│
└─────┬─────┘                                     └────┬─────┘
      │                                                 │
      │ release mic                                    │ response ready
      ▼                                                 │
┌───────────┐    TTS playing                      │
│SPEAKING   │ ◄───────────────────────────────────┘
└─────┬─────┘
      │
      │ TTS complete
      ▼
┌───────────┐
│  IDLE     │ (loop back to LISTENING)
└───────────┘
```

---

## Component Specifications

### 1. AudioWaveform Component

**Purpose**: Display animated audio level bars during voice recording using real-time audio levels from expo-av

**Location**: `apps/mobile/components/ai/AudioWaveform.tsx`

**Props**:
```typescript
interface AudioWaveformProps {
  /** Real-time audio level from 0-1 (from expo-av metering) */
  level: number;
  /** Whether animation is active (recording) */
  isActive: boolean;
  /** Current state for styling */
  state: 'recording' | 'transcribing' | 'error';
  /** Number of bars to display */
  barCount?: number;
}
```

**Design**: Use 7 bars with sine-wave animation pattern
- **Recording state**: Smooth sine wave animation at 60fps
- **Transcribing state**: Slower animation, amber color
- **Error state**: Static bars, red tint

**Implementation Notes**:
- Use `react-native-reanimated` for smooth 60fps animation
- Get real-time levels directly from expo-av recording's metering
- Do NOT use file-based approach - stream levels directly
- Each bar uses sine wave with offset phases for natural look

**Visual Design**:
```
Recording (active - smooth sine wave):
▂ ▃ ▅ ▇ ▅ ▃ ▂ ▃ ▅

Transcribing (slower animation, amber):
▂ ▃ ▅ ▇ ▅ ▃ ▂ ▃ ▅

Error (static, red):
▬ ▬ ▬ ▬ ▬ ▬ ▬ ▬
```

**Default Dimensions**:
- Bar count: 7 bars
- Bar width: 4px
- Bar gap: 4px
- Min bar height: 4px
- Max bar height: 40px
- Corner radius: 2px

**Best Practices Implementation**:
```typescript
// For each bar, calculate height using sine wave
// Best practices: 7 bars, sine wave pattern, 60fps, smooth easing
const barHeight = useDerivedValue(() => {
  const time = withTiming(2 * Math.PI, { 
    duration: 1000, 
    easing: Easing.linear 
  });
  const offset = index * (Math.PI / barCount);
  const wave = Math.sin(time.value + offset);
  return interpolate(wave, [-1, 1], [0.2, 1]) * level;
});
```

### 2. VoiceInputToggle Component

**Purpose**: Mic button that toggles inline voice recording in text input area

**Location**: `apps/mobile/components/ai/VoiceInputToggle.tsx`

**Props**:
```typescript
interface VoiceInputToggleProps {
  /** Current recording state */
  state: 'idle' | 'recording' | 'transcribing' | 'error';
  /** Current audio level 0-1 */
  audioLevel: number;
  /** Error message if state is 'error' */
  error?: string;
  /** Called when mic is tapped */
  onToggle: () => void;
  /** Called when cancel is tapped during recording */
  onCancel: () => void;
}
```

**States**:
1. **Idle**: Shows microphone icon, normal text input visible
2. **Recording**: Shows waveform replacing text input, stop icon on mic
3. **Transcribing**: Shows loading spinner, "Transcribing..." text
4. **Error**: Shows error message, retry button

**Implementation Notes**:
- Replace text input with AudioWaveform when state !== idle
- Animate transition between states (200-300ms)
- Show "Recording..." label under waveform
- Cancel button appears during recording
- After transcription, populate text input with result
- Trigger haptic feedback on state changes:
  - Recording start: medium impact
  - Recording stop: light impact
  - Error: error notification
- Announce state changes for screen readers

### 5. TaskConfirmation Component

**Purpose**: Show summary confirmation after tasks are silently created from voice input

**Location**: `apps/mobile/components/ai/TaskConfirmation.tsx`

**Design Decision**: Tasks are created silently (no per-task confirmation). After processing, show a summary toast/snackbar indicating how many tasks were created. Users can view and edit tasks later in the Tasks screen.

**Props**:
```typescript
interface TaskConfirmationProps {
  /** Number of tasks created */
  taskCount: number;
  /** First task text preview (for context) */
  previewText?: string;
  /** Called when user taps to view tasks */
  onViewTasks?: () => void;
  /** Called when dismissed */
  onDismiss: () => void;
}
```

**Visual Design**:
```
┌─────────────────────────────────────┐
│  ✓ Created 2 tasks                 │
│                                     │
│  "Call mom", "Email dad"           │
│                                     │
│              [View Tasks] [Dismiss] │
└─────────────────────────────────────┘
```

**Features**:
- Shows count of tasks created (e.g., "Created 2 tasks")
- Preview of first task text(s)
- "View Tasks" button to navigate to tasks list
- "Dismiss" to close
- Haptic feedback on appear (light)
- Auto-dismiss after 3 seconds

### 3. VoiceModeButton Component

**Purpose**: Button to enter full Voice Mode

**Location**: `apps/mobile/components/ai/VoiceModeButton.tsx`

**Props**:
```typescript
interface VoiceModeButtonProps {
  /** Called when button is pressed */
  onPress: () => void;
  /** Whether Voice Mode is available */
  disabled?: boolean;
}
```

**Visual Design**:
```
[🚀 Voice Mode]
```

- Use rocket/assistant icon with "Voice Mode" label
- Position next to Voice Input toggle button
- Subtle styling (not as prominent as send button)

### 4. VoiceModeScreen Component

**Purpose**: Full screen Voice Mode experience

**Location**: `apps/mobile/app/(drawer)/(tabs)/sherpa/voice-mode.tsx`

**Navigation**: Opens as a modal/stack screen from Sherpa chat

**Design**: Voice Mode shares chat history with Text Mode - it's the same chat, just with voice input/output

**Props**: None (manages own state via hooks)

**Layout**:
```
┌─────────────────────────────────────────┐
│ [X]                            Voice   │
├─────────────────────────────────────────┤
│                                         │
│     ┌─────────────────────────────┐     │
│     │     AI Response Area       │     │
│     │     (with TTS playback)    │     │
│     └─────────────────────────────┘     │
│                                         │
│     ┌─────────────────────────────┐     │
│     │    [Transcription Area]    │     │
│     │   (shows what's being      │     │
│     │    said in real-time)      │     │
│     └─────────────────────────────┘     │
│                                         │
│     ┌─────────────────────────────┐     │
│     │     🎤 TAP TO SPEAK        │     │
│     │     [Waveform]             │     │
│     └─────────────────────────────┘     │
│                                         │
│     ┌─────────────────────────────┐     │
│     │    [Exit Voice Mode]        │     │
│     └─────────────────────────────┘     │
└─────────────────────────────────────────┘
```

**Implementation Notes**:
- Use full-screen modal presentation
- Manage state via `useVoiceMode` hook
- Use `useTextToSpeech` for AI responses
- Show transcription in real-time during listening
- Auto-advance states based on Voice Mode state machine
- Trigger haptics on all state transitions
- Announce state changes for screen readers
- Persist session to local storage
- Handle app interruptions (stop recording, stop TTS, exit)

### 5. VoiceModeMessage Component

**Purpose**: Display message in Voice Mode with TTS controls

**Location**: `apps/mobile/components/ai/VoiceModeMessage.tsx`

**Props**:
```typescript
interface VoiceModeMessageProps {
  /** Message content */
  content: string;
  /** Who sent the message */
  role: 'user' | 'assistant';
  /** Whether TTS is currently playing this message */
  isPlaying?: boolean;
  /** Called when user taps play on this message */
  onPlay?: () => void;
}
```

---

## Hook Specifications

### 1. useVoiceInput Hook

**Purpose**: Manage inline voice recording in text input area with real-time audio levels

**Location**: `apps/mobile/components/media/use-mobile-audio-recorder.ts` (EXTEND existing hook)

**Design Decisions**:
- Rebuild `use-mobile-audio-recorder.ts` as new `useVoiceInput.ts` hook with all required functionality:
  - Real-time audio metering from expo-av
  - Haptic feedback on all state changes
  - Accessibility announcements via AccessibilityInfo
  - App interruption handling via AppState (stop recording on background/call)
  - Error handling with text input fallback
- Delete unused `use-mobile-audio-recorder.ts` after migration

**API** (new useVoiceInput hook):
```typescript
interface UseVoiceInputReturn {
  /** Current recording state */
  state: 'idle' | 'recording' | 'transcribing' | 'error';
  /** Real-time audio level 0-1 from expo-av metering */
  audioLevel: number;
  /** Transcribed text (available after transcription) */
  transcript: string;
  /** Error message if state is 'error' */
  error?: string;
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording and transcribe */
  stopRecording: () => Promise<void>;
  /** Cancel recording, discard audio */
  cancelRecording: () => void;
  /** Reset to idle */
  reset: () => void;
  /** Whether currently recording */
  isRecording: boolean;
  /** Whether currently transcribing */
  isTranscribing: boolean;
}
```

**Implementation**:
Create new `apps/mobile/hooks/useVoiceInput.ts` with:

1. **Real-time Audio Metering**: Use expo-av with `isMeteringEnabled: true`
2. **Haptic Feedback**: Trigger on state changes (recording start/stop, error)
3. **Accessibility**: Announce state changes via AccessibilityInfo
4. **App Interruption**: Listen to AppState, stop recording when backgrounded
5. **Error Handling**: On transcription error, show message with retry + text input fallback

```typescript
// Simplified structure
export function useVoiceInput() {
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing' | 'error'>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | undefined>();

  // AppState listener for interruption
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState !== 'active' && state === 'recording') {
        cancelRecording();
      }
    });
    return () => subscription.remove();
  }, [state]);

  // Haptic + accessibility on state change
  const setStateWithSideEffects = (newState: typeof state) => {
    if (newState !== state) {
      triggerHaptic(getHapticForState(newState));
      announce(getAnnouncementForState(newState));
      setState(newState);
    }
  };

  // ... recording, transcription logic
}
```
  // Use on-device transcription
  transcript = await transcribeOffline(audioUri);
} else {
  // Use cloud transcription
  transcript = await transcribeOnline(audioUri);
}
```

### 2. useVoiceMode Hook

**Purpose**: Manage full Voice Mode state machine with persistence and accessibility

**Location**: `apps/mobile/hooks/useVoiceMode.ts`

**Design Decisions**:
- Shares chat history with Text Mode
- Persists session to local storage
- Triggers haptic feedback on all state changes
- Announces state changes for screen readers
- Handles app interruptions

**API**:
```typescript
interface UseVoiceModeReturn {
  /** Current Voice Mode state */
  state: 'idle' | 'greeting' | 'listening' | 'processing' | 'speaking' | 'error';
  /** Current audio level during recording */
  audioLevel: number;
  /** Current transcription */
  transcript: string;
  /** Conversation history (synced with chat) */
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  /** Error message if state is 'error' */
  error?: string;
  /** Start Voice Mode */
  enter: () => void;
  /** Exit Voice Mode, return messages */
  exit: () => Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Toggle recording on/off */
  toggleRecording: () => Promise<void>;
  /** Stop AI TTS */
  stopSpeaking: () => void;
}
```

**Implementation - Local Storage**:
```typescript
// Save session on every message
const saveSession = (messages: VoiceModeMessage[]) => {
  const session: VoiceModeSession = {
    id: uuid(),
    startedAt: sessionStartTime,
    messages,
    lastActiveAt: new Date().toISOString(),
  };
  AsyncStorage.setItem(STORAGE_KEYS.VOICE_MODE_SESSION, JSON.stringify(session));
};

// Restore on app reopen
const restoreSession = async () => {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_MODE_SESSION);
  if (stored) {
    const session = JSON.parse(stored) as VoiceModeSession;
    // Check if session is recent (within 24 hours)
    if (isRecent(session.lastActiveAt)) {
      return session.messages;
    }
  }
  return null;
};
```

**Implementation - Haptics**:
```typescript
const announceAndHaptic = (announcement: string, haptic: HapticType) => {
  announce(announcement);  // Screen reader
  triggerHaptic(haptic);   // Haptic feedback
};
```

**Implementation - App Interruption**:
```typescript
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState !== 'active') {
      // Stop TTS if playing
      stopSpeaking();
      // Exit Voice Mode
      exit();
    }
  });
  return () => subscription.remove();
}, []);
```

### 3. useTextToSpeech Hook

**Purpose**: On-device TTS using expo-speech

**Location**: `apps/mobile/hooks/useTextToSpeech.ts`

**API**:
```typescript
interface UseTextToSpeechReturn {
  /** Whether TTS is currently speaking */
  isSpeaking: boolean;
  /** Currently playing text */
  currentText: string | null;
  /** Speak the given text */
  speak: (text: string) => Promise<void>;
  /** Stop current speech */
  stop: () => void;
  /** Pause current speech */
  pause: () => void;
  /** Resume paused speech */
  resume: () => void;
}
```

**Implementation**:
1. Use `expo-speech` for on-device TTS
2. Use system default voice (no custom voice configuration)
3. Handle interruptions (when user starts speaking)
4. Queue management (skip if already speaking)

**Configuration (system defaults)**:
```typescript
await Speech.speak(text, {
  onStart: () => setIsSpeaking(true),
  onDone: () => setIsSpeaking(false),
  onStopped: () => setIsSpeaking(false),
  onError: (error) => handleError(error),
});
```

### 4. useVoiceIntentHandler Hook

**Purpose**: Process voice input through intent detection to action

**Location**: `apps/mobile/hooks/useVoiceIntentHandler.ts`

**Design Decision**: Create tasks silently, show summary confirmation of how many tasks were created. Users can view and edit tasks later in the Tasks screen.

**API**:
```typescript
interface UseVoiceIntentHandlerReturn {
  /** Process voice text and return action */
  processVoiceInput: (text: string) => Promise<VoiceIntentResult>;
  /** Reset handler state */
  reset: () => void;
  /** Tasks created in last processing */
  createdTasks: TaskDetails[];
  /** Whether to show summary */
  showSummary: boolean;
}

interface VoiceIntentResult {
  type: 'create_task' | 'search' | 'chat' | 'error';
  // For create_task - returns created tasks count
  tasksCreated?: number;
  taskPreviews?: string[];
  // For search
  results?: FocusItem[];
  // For chat
  response?: string;
  // For error
  error?: string;
}

interface TaskDetails {
  text: string;
  dueDate?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
}
```

**Flow**:
```
1. User speaks: "Remind me to call mom tomorrow, email dad"
2. Intent detected: 2 create_task intents
3. Create tasks silently via API
4. Show summary toast:
   ┌─────────────────────────────────────┐
   │  ✓ Created 2 tasks                 │
   │                                     │
   │              [View] [Dismiss]      │
   └─────────────────────────────────────┘
5. User can tap "View" to see tasks, or dismiss
```

**Implementation**:
1. Use existing `use-get-user-intent.ts` hook
2. Handle different response types from intent API
3. For 'create' intents, execute immediately and return count
4. Show summary UI after creation

---

## Integration Points

### 1. Sherpa Chat Screen

**File**: `apps/mobile/app/(drawer)/(tabs)/sherpa/index.tsx`

**Changes**:
1. Import VoiceInputToggle and VoiceModeButton components
2. Add to input area (replace existing mic button)
3. Add Voice Mode navigation handler

**Code Example**:
```typescript
import { VoiceInputToggle, VoiceModeButton } from '~/components/ai';
import { useVoiceInput } from '~/hooks/useVoiceInput';

function SherpaScreen() {
  const voiceInput = useVoiceInput();
  
  // ... existing chat logic
  
  return (
    <View>
      {/* Message list */}
      <FlashList data={messages} renderItem={renderMessage} />
      
      {/* Input area */}
      <View style={styles.inputArea}>
        {voiceInput.state === 'idle' ? (
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
          />
        ) : (
          <VoiceInputToggle
            state={voiceInput.state}
            audioLevel={voiceInput.audioLevel}
            onToggle={voiceInput.isRecording ? voiceInput.stopRecording : voiceInput.startRecording}
            onCancel={voiceInput.cancelRecording}
          />
        )}
        
        <VoiceModeButton onPress={() => navigation.push('voice-mode')} />
        
        <SendButton onPress={sendMessage} />
      </View>
    </View>
  );
}
```

### 2. Voice Mode Screen

**File**: `apps/mobile/app/(drawer)/(tabs)/sherpa/voice-mode.tsx`

**Implementation**:
```typescript
import { VoiceModeScreen } from '~/components/ai';
import { useVoiceMode } from '~/hooks/useVoiceMode';

export default function VoiceModePage() {
  const voiceMode = useVoiceMode();
  
  return (
    <VoiceModeScreen
      state={voiceMode.state}
      audioLevel={voiceMode.audioLevel}
      transcript={voiceMode.transcript}
      messages={voiceMode.messages}
      onToggleRecording={voiceMode.toggleRecording}
      onStopSpeaking={voiceMode.stopSpeaking}
      onExit={() => {
        const messages = voiceMode.exit();
        // Add to chat history
        navigation.goBack();
      }}
    />
  );
}
```

---

## API Contracts

### 1. Transcription Endpoint

**Existing**: `POST /api/voice/transcribe`

**Request**:
```typescript
interface TranscriptionRequest {
  audio: File; // or FormData with audio file
  language?: string; // default 'en-US'
}
```

**Response**:
```typescript
interface TranscriptionResponse {
  text: string;
  duration?: number;
  confidence?: number;
}
```

### 2. Intent Derivation Endpoint

**Existing**: `POST /api/mobile/intents/derive`

**Request**:
```typescript
interface IntentDerivationRequest {
  text: string;
  context?: {
    location?: { lat: number; lng: number };
    time?: string;
  };
}
```

**Response**:
```typescript
interface IntentDerivationResponse {
  intents: Array<{
    type: 'create' | 'search' | 'chat';
    // For create
    task?: {
      text: string;
      dueDate?: string;
      category?: string;
      priority?: 'low' | 'medium' | 'high';
    };
    // For search
    query?: string;
    // For chat
    message?: string;
  }>;
}
```

### 3. Future Enhancement: On-Device Transcription

For future offline support, could integrate whisper.cpp:

```typescript
// Future enhancement - not in scope
async function transcribeOffline(audioUri: string): Promise<string> {
  // Load audio file
  const audioData = await loadAudioFile(audioUri);
  
  // Run through local Whisper model
  const result = await whisper.transcribe(audioData);
  
  return result.text;
}
```

**Current behavior**: On transcription failure, show error and offer text input fallback.

---

## Analytics & Events

### Voice Events to Track

| Event | When | Data |
|-------|------|------|
| `voice_input_started` | User taps mic | - |
| `voice_input_stopped` | User stops recording | { duration } |
| `voice_transcribe_requested` | Send for transcription | { duration, hasNetwork } |
| `voice_transcribe_success` | Transcription complete | { textLength, latency } |
| `voice_transcribe_failed` | Transcription failed | { error, hasNetwork } |
| `voice_mode_entered` | Enter Voice Mode | - |
| `voice_mode_exited` | Exit Voice Mode | { messageCount, totalDuration } |
| `tts_started` | TTS begins | { textLength } |
| `tts_completed` | TTS finishes | { textLength, duration } |
| `tts_interrupted` | TTS interrupted by user | { textLength, playedDuration } |

---

## Error Handling

### Error States & Recovery

| Error | User Message | Recovery | Haptic |
|-------|--------------|----------|--------|
| Mic permission denied | "Microphone access needed. Tap to open Settings." | Open settings button | error |
| Recording failed | "Couldn't start recording. Tap to retry." | Retry button | error |
| Recording interrupted (app background/phone call) | (Silent - audio discarded) | Auto-return to idle | light |
| Transcription failed | "Couldn't understand. Tap to retry or type your message." | Retry button + text input fallback | error |
| TTS failed | (Silent failure) | Log error, continue | - |
| Network error | "No connection. Voice input unavailable." | Switch to text | warning |
| Task creation failed | "Couldn't create task. Tap to retry." | Retry button | error |

### Interruption Handling

**Recording automatically stops and discards audio when**:
- App goes to background
- Screen locks
- Phone call begins
- User switches to another app

**Implementation**:
```typescript
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState !== 'active' && recordingRef.current) {
      // Stop recording immediately
      cancelRecording();
      // Haptic feedback
      triggerHaptic('light');
      // Announce for screen reader
      announce('Recording stopped');
    }
  });

  return () => subscription.remove();
}, []);
```

### Offline Detection

```typescript
// Check network status
const isOnline = () => {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
};

// Before transcription, check network
if (!isOnline()) {
  // Offer offline mode or text input
  showOfflineMessage();
}
```

---

## Accessibility Considerations

### Screen Reader Support (Required)

**Implementation**: Use React Native's AccessibilityInfo to announce state changes

**Announcements by State**:

| State | Announcement | Priority |
|-------|--------------|----------|
| Voice Input started | "Recording started" | assertive |
| Voice Input stopped | "Recording stopped, transcribing" | polite |
| Transcribing | "Transcribing your message" | polite |
| Voice Mode entered | "Voice mode enabled. Tap the microphone to speak." | assertive |
| Listening | "Listening..." | assertive |
| Processing | "Processing your request" | polite |
| Speaking (TTS) | "Speaking" | polite |
| Voice Mode exited | "Voice mode disabled. Returned to text mode." | assertive |
| Task confirmation | "Task: [task text]. Due: [date]. Double tap to confirm." | assertive |
| Error | "[Error message]. Double tap to retry." | assertive |

**Implementation**:
```typescript
import { AccessibilityInfo } from 'react-native';

function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  if (priority === 'assertive') {
    AccessibilityInfo.announceForAccessibility(message);
  } else {
    // Use live region for polite announcements
  }
}
```

### Haptic Feedback

All voice interactions include haptic feedback - see Detailed Design Decisions section.

### Visual Accessibility

1. **Waveform provides visual feedback** for deaf/hard-of-hearing users
2. **Large touch targets**: Minimum 44x44pt for all voice buttons
3. **High contrast** between waveform bars and background
4. **Reduced motion**: Respect system reduced-motion preference for animations

---

## Implementation Checklist

### Phase 1: Voice Input (Inline Recording)

- [ ] Create AudioWaveform component (real-time levels from expo-av)
- [ ] Create VoiceInputToggle component (with haptics)
- [ ] Create useVoiceInput hook (haptics, accessibility, app interruption, error handling)
- [ ] Delete unused `use-mobile-audio-recorder.ts`
- [ ] Delete unused components (audio-recorder.tsx, mobile-voice-input.tsx, audio-meterings.tsx, voice-events.ts)
- [ ] Integrate with Sherpa chat screen
- [ ] Test recording flow
- [ ] Test transcription flow
- [ ] Test app interruption handling (background, phone call)
- [ ] Test error handling (retry + text input fallback)

### Phase 2: Voice Mode (Full Screen)

- [ ] Create VoiceModeButton component
- [ ] Create VoiceModeScreen component
- [ ] Create VoiceModeMessage component
- [ ] Create useVoiceMode hook (with persistence, haptics, screen reader)
- [ ] Add navigation from Sherpa to Voice Mode
- [ ] Test full conversation flow
- [ ] Test persistence (app close/reopen)
- [ ] Test app interruption handling in Voice Mode
- [ ] Verify chat history is shared with Text Mode

### Phase 3: Text-to-Speech

- [ ] Create useTextToSpeech hook
- [ ] Integrate TTS with Voice Mode responses
- [ ] Handle TTS interruption (when user speaks)
- [ ] Add haptic feedback for TTS events
- [ ] Test various text lengths

### Phase 4: Task Confirmation

- [ ] Create TaskConfirmation component
- [ ] Integrate with useVoiceIntentHandler
- [ ] Show confirmation before task creation
- [ ] Allow editing before confirm
- [ ] Add haptic feedback on confirm/cancel

### Phase 5: Testing & Polish

- [ ] End-to-end voice input testing
- [ ] End-to-end Voice Mode testing
- [ ] Offline fallback testing
- [ ] Accessibility testing (VoiceOver/TalkBack)
- [ ] Performance testing (60fps animations)
- [ ] Error recovery testing

---

## Testing Plan

### Unit Tests

| Component | Tests |
|-----------|-------|
| AudioWaveform | Renders correctly, animates when active |
| VoiceInputToggle | All states render correctly, events fire |
| useVoiceInput | State transitions, error handling |
| useVoiceMode | State machine transitions |
| useTextToSpeech | Speak, stop, pause, resume |

### Integration Tests

| Flow | Tests |
|------|-------|
| Voice Input | Record → Transcribe → Send |
| Voice Mode | Enter → Speak → Response → Speak → Exit |
| Error/Fallback | Transcription fails → Show error + text input |

### E2E Tests

| Scenario | Tests |
|----------|-------|
| Happy path voice input | Record voice → Send → Verify in chat |
| Voice Mode conversation | Full conversation → Verify transcriptions |
| Error recovery | Fail recording → Retry → Success |

---

## Dependencies

### Existing Dependencies (Already in Project)

| Package | Usage |
|---------|-------|
| `expo-av` | Audio recording |
| `expo-speech` | Text-to-speech |
| `react-native-reanimated` | Waveform animations |
| `@tanstack/react-query` | API caching |
| `react-native-gesture-handler` | Touch handling |

### New Dependencies

| Package | Reason |
|---------|--------|
| `expo-haptics` | Haptic feedback on state changes |

---

## File Summary

### New Files to Create

```
apps/mobile/
├── components/ai/
│   ├── AudioWaveform.tsx           # Animated bars visualization (real-time levels)
│   ├── VoiceInputToggle.tsx        # Mic button + inline waveform
│   ├── VoiceModeButton.tsx         # Enter Voice Mode button
│   ├── VoiceModeScreen.tsx         # Full screen Voice Mode
│   ├── VoiceModeMessage.tsx        # Message in Voice Mode
│   └── TaskConfirmation.tsx        # Task summary confirmation (toast style)
├── hooks/
│   ├── useVoiceMode.ts             # Voice Mode state + persistence
│   ├── useTextToSpeech.ts          # On-device TTS
│   └── useVoiceIntentHandler.ts    # Voice → intent → action + summary
└── app/(drawer)/(tabs)/sherpa/
    └── voice-mode.tsx              # Full screen route
```

### Files to Extend/Modify

```
apps/mobile/
├── hooks/useVoiceInput.ts                  # NEW: Create with haptics, accessibility, app interruption
├── components/media/use-audio-transcribe.ts       # Keep as-is (already works)
├── components/notes/use-get-user-intent.ts        # Keep as-is (already works)
├── app/(drawer)/(tabs)/sherpa/index.tsx           # Add voice components
└── utils/services/chat/use-chat-messages.ts       # Integrate for chat history sharing
```

### Files to Delete (Unused)

```
apps/mobile/
├── components/media/
│   ├── audio-recorder.tsx           # DELETE - unused
│   ├── mobile-voice-input.tsx      # DELETE - unused
│   ├── audio-meterings.tsx         # DELETE - unused
│   └── use-mobile-audio-recorder.ts  # DELETE - replaced by useVoiceInput
└── utils/
    └── voice-events.ts             # DELETE - unused
```
apps/mobile/
├── components/media/use-mobile-audio-recorder.ts  # EXTEND: Add haptics, accessibility, app interruption
├── components/media/use-audio-transcribe.ts       # Keep as-is (already works)
├── components/notes/use-get-user-intent.ts        # Keep as-is (already works)
├── app/(drawer)/(tabs)/sherpa/index.tsx           # Add voice components
└── utils/services/chat/use-chat-messages.ts       # Integrate for chat history sharing
```

### Files to Enable (Existing Unused)

```
apps/mobile/
├── components/media/
│   ├── audio-recorder.tsx
│   ├── mobile-voice-input.tsx
│   └── audio-meterings.tsx
└── utils/
    └── voice-events.ts
```

---

## Timeline Estimate

| Phase | Tasks | Days |
|-------|-------|------|
| Phase 1 | Voice Input (inline) | 3-4 |
| Phase 2 | Voice Mode (full screen) | 3-4 |
| Phase 3 | Text-to-Speech | 2 |
| Phase 4 | Task Confirmation | 1-2 |
| Phase 5 | Testing & Polish | 2-3 |
| **Total** | | **11-15** |

---

## Future Enhancements

1. **On-device Whisper**: Full offline transcription support (fallback to text input for now)
2. **Wake word**: "Hey Sherpa" to activate voice
3. **Voice profiles**: Different voices for different contexts
4. **Continuous recording**: Always-listening mode (with explicit consent)
5. **Multi-modal**: Voice + camera input combined

---

## Related Documentation

- Existing mobile voice hooks: `apps/mobile/utils/services/audio/`
- AI Elements components: `packages/ui/src/components/ai-elements/`
- Backend voice API: `services/api/src/routes/voice.ts`
