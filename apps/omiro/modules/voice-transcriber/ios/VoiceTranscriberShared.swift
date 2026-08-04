import AVFoundation
import ExpoModulesCore
import Foundation
import Speech
import os.log

let voiceTranscriberLog = OSLog(subsystem: "com.hominem.omiro", category: "VoiceTranscriber")

// The size of each chunk read from the recorded file and streamed into the
// analyzer. Arbitrary but small enough to keep memory flat for long
// recordings and large enough to avoid excessive read/convert overhead.
let fileReadChunkFrameCount: AVAudioFrameCount = 4096

// A single Exception type carrying a stable `code` alongside its message, so
// the JS side can branch on `error.code` (e.g. to route a revoked-permission
// failure to the same UX as the initial permission gate) instead of parsing
// free-text error messages, which are not a stable contract.
final class VoiceTranscriberException: Exception, @unchecked Sendable {
  private let messageText: String
  private let codeText: String

  init(code: String, message: String) {
    self.codeText = code
    self.messageText = message
    super.init()
  }

  override var reason: String {
    messageText
  }

  override var code: String {
    codeText
  }

  static var invalidAudioURL: VoiceTranscriberException {
    VoiceTranscriberException(code: "INVALID_AUDIO_URL", message: "Invalid audio file URL.")
  }

  static var recognizerUnavailable: VoiceTranscriberException {
    VoiceTranscriberException(
      code: "RECOGNIZER_UNAVAILABLE",
      message: "Speech recognizer unavailable for the current locale."
    )
  }

  static var missingPermission: VoiceTranscriberException {
    VoiceTranscriberException(
      code: "MISSING_PERMISSION",
      message: "Speech recognition permission is required."
    )
  }

  static var emptyTranscript: VoiceTranscriberException {
    VoiceTranscriberException(
      code: "EMPTY_TRANSCRIPT",
      message: "No speech could be transcribed from this recording."
    )
  }
}

struct VoiceTranscriptionResult: Record {
  @Field
  var rawText: String = ""

  @Field
  var locale: String = ""

  @Field
  var engine: String = "speech-analyzer"

  @Field
  var isOnDevice: Bool = true
}

// SpeechAnalyzer's `AnalyzerInput` buffers must match a format the analyzer
// negotiated with its modules (`SpeechAnalyzer.bestAvailableAudioFormat`),
// which rarely matches the format audio was recorded/read in — so every
// buffer read from the file has to be converted before being handed off.
final class BufferConverter {
  enum ConversionError: Error {
    case failedToCreateConverter
    case failedToCreateConversionBuffer
    case conversionFailed(NSError?)
  }

  private var converter: AVAudioConverter?

  func convertBuffer(_ buffer: AVAudioPCMBuffer, to format: AVAudioFormat) throws
    -> AVAudioPCMBuffer
  {
    let inputFormat = buffer.format
    guard inputFormat != format else {
      return buffer
    }

    if converter == nil || converter?.outputFormat != format {
      converter = AVAudioConverter(from: inputFormat, to: format)
      // Sacrifice quality of the first samples to avoid timestamp drift
      // across chunk boundaries.
      converter?.primeMethod = .none
    }

    guard let converter else {
      throw ConversionError.failedToCreateConverter
    }

    let sampleRateRatio = converter.outputFormat.sampleRate / converter.inputFormat.sampleRate
    let scaledInputFrameLength = Double(buffer.frameLength) * sampleRateRatio
    let frameCapacity = AVAudioFrameCount(scaledInputFrameLength.rounded(.up))
    guard
      let conversionBuffer = AVAudioPCMBuffer(
        pcmFormat: converter.outputFormat, frameCapacity: max(frameCapacity, 1))
    else {
      throw ConversionError.failedToCreateConversionBuffer
    }

    var nsError: NSError?
    var didProvideInput = false
    let status = converter.convert(to: conversionBuffer, error: &nsError) { _, inputStatusPointer in
      guard !didProvideInput else {
        inputStatusPointer.pointee = .noDataNow
        return nil
      }
      didProvideInput = true
      inputStatusPointer.pointee = .haveData
      return buffer
    }

    guard status != .error else {
      throw ConversionError.conversionFailed(nsError)
    }

    return conversionBuffer
  }
}

func permissionStatusString(_ status: SFSpeechRecognizerAuthorizationStatus) -> String {
  switch status {
  case .authorized:
    return "authorized"
  case .denied:
    return "denied"
  case .notDetermined:
    return "notDetermined"
  case .restricted:
    return "restricted"
  @unknown default:
    return "restricted"
  }
}

func requestSpeechRecognitionAuthorization() async -> SFSpeechRecognizerAuthorizationStatus {
  await withCheckedContinuation { continuation in
    DispatchQueue.main.async {
      SFSpeechRecognizer.requestAuthorization { status in
        continuation.resume(returning: status)
      }
    }
  }
}
