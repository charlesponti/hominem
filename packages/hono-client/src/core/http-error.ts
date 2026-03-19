export class HonoHttpError extends Error {
  public readonly status: number
  public readonly responseText: string

  constructor(message: string, status: number, responseText: string) {
    super(message)
    this.status = status
    this.responseText = responseText
    this.name = 'HonoHttpError'

    Object.setPrototypeOf(this, HonoHttpError.prototype)
  }
}
