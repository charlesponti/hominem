declare module 'bun:sqlite' {
  export class Database {
    constructor(filename: string, options?: { create?: boolean });
    run(sql: string, ...params: unknown[]): unknown;
    exec(sql: string): void;
    query<T = unknown>(
      sql: string,
    ): {
      get: (...params: unknown[]) => T | undefined;
      all: (...params: unknown[]) => T[];
      run: (...params: unknown[]) => void;
    };
    prepare(sql: string): {
      run: (...params: unknown[]) => unknown;
      all: (...params: unknown[]) => unknown[];
      get: (...params: unknown[]) => unknown;
    };
    close(): void;
  }
}

declare module 'vcard-parser';
