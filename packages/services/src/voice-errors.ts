export class VoiceServiceError extends Error {
  code?: string;
  statusCode: number;

  constructor(message: string, code?: string, statusCode = 500) {
    super(message);
    this.name = new.target.name;
    if (code !== undefined) {
      this.code = code;
    }
    this.statusCode = statusCode;
  }
}
