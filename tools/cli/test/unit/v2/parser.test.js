import { describe, expect, it } from 'bun:test';
import { parseArgv } from '../../../src/v2/parser';
describe('v2 parser', () => {
    it('parses global flags and positional tokens', () => {
        const result = parseArgv([
            'auth',
            'login',
            '--format',
            'json',
            '--device',
            '--scope',
            'cli:read',
        ]);
        expect(result.commandTokens).toEqual(['auth', 'login']);
        expect(result.globals.outputFormat).toBe('json');
        expect(result.flags.device).toBe(true);
        expect(result.flags.scope).toBe('cli:read');
    });
});
