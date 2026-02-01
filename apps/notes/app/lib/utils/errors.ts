/**
 * Base error class that can be converted to a React Router Response
 */
export class LoaderError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
    this.name = 'LoaderError';
  }

  /**
   * Converts the error to a React Router Response
   */
  toResponse(): Response {
    return new Response(this.message, { status: this.status });
  }
}

/**
 * Error thrown when chat loading fails
 */
export class ChatLoadError extends LoaderError {
  constructor(message = 'Failed to load chat', status = 500) {
    super(message, status);
    this.name = 'ChatLoadError';
  }
}

/**
 * Error thrown when chat creation fails
 */
export class ChatCreationError extends LoaderError {
  constructor(message = 'Failed to create chat', status = 500) {
    super(message, status);
    this.name = 'ChatCreationError';
  }
}
