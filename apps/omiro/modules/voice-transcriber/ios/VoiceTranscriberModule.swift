import ExpoModulesCore
import Speech
import os.log

public class VoiceTranscriberModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VoiceTranscriber")

    AsyncFunction("getPermissions") { () async -> String in
      permissionStatusString(SFSpeechRecognizer.authorizationStatus())
    }

    AsyncFunction("requestPermissions") { () async -> String in
      let status = await requestSpeechRecognitionAuthorization()
      return permissionStatusString(status)
    }

    AsyncFunction("transcribeFile") { (audioUri: String) async throws -> VoiceTranscriptionResult in
      os_log("transcribeFile AsyncFunction invoked", log: voiceTranscriberLog, type: .info)
      do {
        let result = try await transcribeAudioFile(at: audioUri)
        os_log("transcribeFile AsyncFunction resolving successfully", log: voiceTranscriberLog, type: .info)
        return result
      } catch {
        os_log("transcribeFile AsyncFunction rejecting: %{public}@", log: voiceTranscriberLog, type: .error, String(describing: error))
        throw error
      }
    }
  }
}
