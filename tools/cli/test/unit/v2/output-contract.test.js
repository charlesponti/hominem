import { describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCli } from '../../../src/v2/runtime';
function normalizeChunk(chunk) {
    if (typeof chunk === 'string') {
        return chunk;
    }
    return Buffer.from(chunk).toString('utf-8');
}
async function runCaptured(argv) {
    let stdout = '';
    let stderr = '';
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    const originalStderrWrite = process.stderr.write.bind(process.stderr);
    process.stdout.write = ((chunk) => {
        stdout += normalizeChunk(chunk);
        return true;
    });
    process.stderr.write = ((chunk) => {
        stderr += normalizeChunk(chunk);
        return true;
    });
    try {
        const result = await runCli(argv);
        return {
            exitCode: result.exitCode,
            stdout,
            stderr,
        };
    }
    finally {
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;
    }
}
async function withCwd(cwd, run) {
    const previous = process.cwd();
    process.chdir(cwd);
    try {
        return await run();
    }
    finally {
        process.chdir(previous);
    }
}
async function withIsolatedPaths(hominemHome, run) {
    const previousHome = process.env.HOME;
    const previousUserProfile = process.env.USERPROFILE;
    const previousHominemHome = process.env.HOMINEM_HOME;
    process.env.HOME = hominemHome;
    process.env.USERPROFILE = hominemHome;
    process.env.HOMINEM_HOME = hominemHome;
    try {
        return await run();
    }
    finally {
        if (previousHome === undefined) {
            delete process.env.HOME;
        }
        else {
            process.env.HOME = previousHome;
        }
        if (previousUserProfile === undefined) {
            delete process.env.USERPROFILE;
        }
        else {
            process.env.USERPROFILE = previousUserProfile;
        }
        if (previousHominemHome === undefined) {
            delete process.env.HOMINEM_HOME;
        }
        else {
            process.env.HOMINEM_HOME = previousHominemHome;
        }
    }
}
function parseSuccessEnvelope(format, stdout) {
    const raw = format === 'ndjson' ? stdout.trim().split('\n')[0] : stdout;
    return JSON.parse(raw);
}
function normalizeEnvelope(input, hominemHome) {
    const normalizedString = JSON.stringify(input.data).replaceAll(hominemHome, '<hominem-home>');
    return {
        ok: true,
        command: input.command,
        timestamp: '<timestamp>',
        message: input.message,
        data: JSON.parse(normalizedString),
    };
}
describe('v2 output contract snapshots', () => {
    it('matches normalized json/ndjson envelopes for core commands', async () => {
        const cliRoot = process.cwd();
        const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hominem-output-contract-'));
        const hominemHome = path.join(sandboxRoot, 'home');
        fs.mkdirSync(hominemHome, { recursive: true });
        await withIsolatedPaths(hominemHome, async () => {
            for (const format of ['json', 'ndjson']) {
                const configInit = await withCwd(cliRoot, async () => runCaptured(['config', 'init', '--format', format]));
                expect(configInit.exitCode).toBe(0);
                const configSet = await withCwd(cliRoot, async () => runCaptured(['config', 'set', 'output.format', '"json"', '--format', format]));
                expect(configSet.exitCode).toBe(0);
                expect(normalizeEnvelope(parseSuccessEnvelope(format, configSet.stdout), hominemHome)).toEqual({
                    ok: true,
                    command: 'config set',
                    timestamp: '<timestamp>',
                    message: 'Set config values',
                    data: {
                        updatedPath: 'output.format',
                        value: 'json',
                    },
                });
                const configGet = await withCwd(cliRoot, async () => runCaptured(['config', 'get', 'output.format', '--format', format]));
                expect(configGet.exitCode).toBe(0);
                expect(normalizeEnvelope(parseSuccessEnvelope(format, configGet.stdout), hominemHome)).toEqual({
                    ok: true,
                    command: 'config get',
                    timestamp: '<timestamp>',
                    message: 'Get config values',
                    data: {
                        value: 'json',
                    },
                });
                const authStatus = await withCwd(cliRoot, async () => runCaptured(['auth', 'status', '--format', format]));
                expect(authStatus.exitCode).toBe(0);
                expect(normalizeEnvelope(parseSuccessEnvelope(format, authStatus.stdout), hominemHome)).toEqual({
                    ok: true,
                    command: 'auth status',
                    timestamp: '<timestamp>',
                    message: 'Show authentication status',
                    data: {
                        authenticated: false,
                        tokenVersion: null,
                        provider: null,
                        issuerBaseUrl: null,
                        expiresAt: null,
                        ttlSeconds: null,
                        scopes: [],
                    },
                });
                const systemDoctor = await withCwd(cliRoot, async () => runCaptured(['system', 'doctor', '--format', format]));
                expect(systemDoctor.exitCode).toBe(0);
                const normalizedDoctor = normalizeEnvelope(parseSuccessEnvelope(format, systemDoctor.stdout), hominemHome);
                const doctorData = normalizedDoctor.data;
                expect(normalizedDoctor.ok).toBeTrue();
                expect(normalizedDoctor.command).toBe('system doctor');
                expect(normalizedDoctor.timestamp).toBe('<timestamp>');
                expect(normalizedDoctor.message).toBe('Run CLI diagnostics');
                expect(Array.isArray(doctorData.checks)).toBeTrue();
                expect(doctorData.checks.some((check) => check.id === 'runtime.node' && check.status === 'pass')).toBeTrue();
                expect(doctorData.checks.some((check) => check.id === 'config.v2' &&
                    check.status === 'pass' &&
                    check.message === 'config version 2')).toBeTrue();
                expect(doctorData.checks.some((check) => check.id === 'auth.token' && check.status === 'warn')).toBeTrue();
            }
        });
    });
});
