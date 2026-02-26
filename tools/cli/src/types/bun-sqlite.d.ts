declare module 'bun:sqlite' {
  export class Database {
    constructor(filename: string, options?: { create?: boolean });
    run(sql: string, ...params: any[]): any;
    exec(sql: string): void;
    query<T = any>(
      sql: string,
    ): {
      get: (...params: any[]) => T | undefined;
      all: (...params: any[]) => T[];
      run: (...params: any[]) => void;
    };
    prepare(sql: string): {
      run: (...params: any[]) => any;
      all: (...params: any[]) => any[];
      get: (...params: any[]) => any;
    };
    close(): void;
  }
}

declare module 'vcard-parser';
