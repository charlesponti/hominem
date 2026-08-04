import AVFoundation
import Foundation
import Speech
import os.log

// Reserves the locale's on-device model with the system and downloads its
// assets if they aren't installed yet. Reservation is left in place after
// this returns (rather than released at the end of each call) so repeat
// transcriptions don't pay the download/allocation cost every time — this
// mirrors Apple's own SpeechAnalyzer sample usage.
func ensureModelReady(for transcriber: SpeechTranscriber, locale: Locale) async throws {
  let supportedLocales = await SpeechTranscriber.supportedLocales
  let isSupported = supportedLocales.contains { $0.identifier(.bcp47) == locale.identifier(.bcp47) }
  guard isSupported else {
    os_log(
      "ensureModelReady: locale unsupported locale=%{public}@",
      log: voiceTranscriberLog,
      type: .error,
      locale.identifier
    )
    throw VoiceTranscriberException.recognizerUnavailable
  }

  do {
    try await AssetInventory.reserve(locale: locale)
  } catch {
    os_log(
      "ensureModelReady: locale reservation failed error=%{public}@",
      log: voiceTranscriberLog,
      type: .error,
      String(describing: error)
    )
    throw VoiceTranscriberException.recognizerUnavailable
  }

  do {
    if let downloader = try await AssetInventory.assetInstallationRequest(supporting: [transcriber]) {
      os_log("ensureModelReady: downloading on-device model assets", log: voiceTranscriberLog, type: .info)
      try await downloader.downloadAndInstall()
      os_log("ensureModelReady: model assets installed", log: voiceTranscriberLog, type: .info)
    }
  } catch {
    os_log(
      "ensureModelReady: asset download failed error=%{public}@",
      log: voiceTranscriberLog,
      type: .error,
      String(describing: error)
    )
    throw VoiceTranscriberException.recognizerUnavailable
  }
}

// Reads the recorded file in chunks, converts each chunk to the analyzer's
// negotiated format, and yields it into the analyzer's input stream —
// SpeechAnalyzer has no built-in "transcribe this file" entry point, only a
// live `AsyncSequence<AnalyzerInput>`, so a pre-recorded file is fed through
// the same streaming interface a microphone would use.
func streamFile(
  at fileURL: URL,
  targetFormat: AVAudioFormat,
  into continuation: AsyncStream<AnalyzerInput>.Continuation
) throws {
  let audioFile = try AVAudioFile(forReading: fileURL)
  let converter = BufferConverter()

  guard
    let readBuffer = AVAudioPCMBuffer(
      pcmFormat: audioFile.processingFormat, frameCapacity: fileReadChunkFrameCount)
  else {
    throw VoiceTranscriberException.invalidAudioURL
  }

  while audioFile.framePosition < audioFile.length {
    readBuffer.frameLength = 0
    try audioFile.read(into: readBuffer, frameCount: fileReadChunkFrameCount)
    guard readBuffer.frameLength > 0 else { break }

    let converted = try converter.convertBuffer(readBuffer, to: targetFormat)
    continuation.yield(AnalyzerInput(buffer: converted))
  }
}

func transcribeAudioFile(at audioUri: String) async throws -> VoiceTranscriptionResult {
  os_log("transcribeAudioFile: start uri=%{public}@", log: voiceTranscriberLog, type: .info, audioUri)

  let authStatus = SFSpeechRecognizer.authorizationStatus()
  os_log("transcribeAudioFile: authStatus=%{public}@", log: voiceTranscriberLog, type: .info, permissionStatusString(authStatus))
  guard authStatus == .authorized else {
    os_log("transcribeAudioFile: missing permission, throwing", log: voiceTranscriberLog, type: .error)
    throw VoiceTranscriberException.missingPermission
  }

  guard let fileURL = URL(string: audioUri), fileURL.isFileURL else {
    os_log("transcribeAudioFile: invalid audio URL, throwing", log: voiceTranscriberLog, type: .error)
    throw VoiceTranscriberException.invalidAudioURL
  }

  let fileExists = FileManager.default.fileExists(atPath: fileURL.path)
  os_log(
    "transcribeAudioFile: fileExists=%{public}@",
    log: voiceTranscriberLog,
    type: .info,
    String(fileExists)
  )
  guard fileExists else {
    throw VoiceTranscriberException.invalidAudioURL
  }

  let locale = Locale(identifier: Locale.preferredLanguages.first ?? Locale.current.identifier)

  // SpeechAnalyzer is on-device only by design — there is no server-based
  // fallback mode to opt into, unlike the legacy SFSpeechRecognizer.
  let transcriber = SpeechTranscriber(
    locale: locale,
    transcriptionOptions: [],
    reportingOptions: [],
    attributeOptions: []
  )

  try await ensureModelReady(for: transcriber, locale: locale)

  let analyzer = SpeechAnalyzer(modules: [transcriber])

  guard let analyzerFormat = await SpeechAnalyzer.bestAvailableAudioFormat(compatibleWith: [transcriber]) else {
    os_log("transcribeAudioFile: no compatible audio format for analyzer, throwing", log: voiceTranscriberLog, type: .error)
    throw VoiceTranscriberException.recognizerUnavailable
  }

  let (inputSequence, inputBuilder) = AsyncStream<AnalyzerInput>.makeStream()

  // Consumed concurrently with feeding the file below — SpeechAnalyzer
  // streams results as they become available rather than returning a single
  // value, so results are accumulated in a background task the same way
  // Apple's own sample app does it.
  let resultsTask = Task<String, Error> {
    var finalizedText = ""
    for try await result in transcriber.results where result.isFinal {
      finalizedText += String(result.text.characters)
    }
    return finalizedText
  }

  do {
    try await analyzer.start(inputSequence: inputSequence)

    try streamFile(at: fileURL, targetFormat: analyzerFormat, into: inputBuilder)
    inputBuilder.finish()

    try await analyzer.finalizeAndFinishThroughEndOfInput()
  } catch {
    inputBuilder.finish()
    resultsTask.cancel()
    os_log(
      "transcribeAudioFile: analysis failed error=%{public}@",
      log: voiceTranscriberLog,
      type: .error,
      String(describing: error)
    )
    throw error
  }

  let transcript = try await resultsTask.value
    .trimmingCharacters(in: .whitespacesAndNewlines)

  os_log(
    "transcribeAudioFile: transcription complete transcriptLength=%{public}d",
    log: voiceTranscriberLog,
    type: .info,
    transcript.count
  )

  guard !transcript.isEmpty else {
    throw VoiceTranscriberException.emptyTranscript
  }

  return VoiceTranscriptionResult(
    rawText: transcript,
    locale: locale.identifier,
    engine: "speech-analyzer",
    isOnDevice: true
  )
}
