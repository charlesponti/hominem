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
async function withEnv(vars, run) {
    const previous = {};
    for (const [key, value] of Object.entries(vars)) {
        previous[key] = process.env[key];
        process.env[key] = value;
    }
    try {
        return await run();
    }
    finally {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) {
                delete process.env[key];
            }
            else {
                process.env[key] = value;
            }
        }
    }
}
function parseSuccessEnvelope(result) {
    return JSON.parse(result.stdout);
}
describe('v2 integration HOMINEM_HOME isolation', () => {
    it('keeps config/auth/agent paths inside HOMINEM_HOME', async () => {
        const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hominem-home-isolation-'));
        const fakeHome = path.join(sandboxRoot, 'fake-home');
        const hominemHome = path.join(sandboxRoot, 'isolated-hominem');
        fs.mkdirSync(fakeHome, { recursive: true });
        fs.mkdirSync(hominemHome, { recursive: true });
        await withEnv({
            HOME: fakeHome,
            USERPROFILE: fakeHome,
            HOMINEM_HOME: hominemHome,
        }, async () => {
            const configInit = await runCaptured(['config', 'init', '--format', 'json']);
            expect(configInit.exitCode).toBe(0);
            const configInitEnvelope = parseSuccessEnvelope(configInit);
            const configPathValue = configInitEnvelope.data.path;
            expect(typeof configPathValue).toBe('string');
            if (typeof configPathValue !== 'string') {
                throw new Error('config init path must be string');
            }
            const configPath = configPathValue;
            expect(configPath.startsWith(hominemHome)).toBeTrue();
            expect(fs.existsSync(configPath)).toBeTrue();
            const authStatus = await runCaptured(['auth', 'status', '--format', 'json']);
            expect(authStatus.exitCode).toBe(0);
            const agentStatus = await runCaptured(['agent', 'status', '--format', 'json']);
            expect(agentStatus.exitCode).toBe(0);
            const agentStatusEnvelope = parseSuccessEnvelope(agentStatus);
            const pidPathValue = agentStatusEnvelope.data.pidPath;
            expect(typeof pidPathValue).toBe('string');
            if (typeof pidPathValue !== 'string') {
                throw new Error('agent status pidPath must be string');
            }
            const pidPath = pidPathValue;
            expect(pidPath.startsWith(hominemHome)).toBeTrue();
            const fakeHomeEntries = fs.readdirSync(fakeHome);
            expect(fakeHomeEntries.length).toBe(0);
        });
    });
});
