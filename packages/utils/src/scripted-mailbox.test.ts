import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  appendScriptedMailboxRecord,
  readLatestScriptedOtp,
  resolveScriptedMailboxPath,
} from './scripted-mailbox';

describe('scripted mailbox', () => {
  let dir: string;
  let mailboxFile: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mailbox-test-'));
    mailboxFile = join(dir, 'mailbox.jsonl');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('resolves an explicit path, then env, then the user default', () => {
    expect(resolveScriptedMailboxPath('/explicit/mailbox.jsonl')).toBe('/explicit/mailbox.jsonl');
    process.env.HOMINEM_SCRIPTED_MAILBOX = '/from-env/mailbox.jsonl';
    try {
      expect(resolveScriptedMailboxPath()).toBe('/from-env/mailbox.jsonl');
    } finally {
      delete process.env.HOMINEM_SCRIPTED_MAILBOX;
    }
    expect(resolveScriptedMailboxPath('')).toMatch(/\.hominem\/scripted-mailbox\.jsonl$/);
  });

  it('returns null when the mailbox does not exist yet', () => {
    expect(readLatestScriptedOtp(mailboxFile, 'a@test.hominem.dev')).toBeNull();
  });

  it('returns the latest OTP for the exact recipient only', () => {
    appendScriptedMailboxRecord(mailboxFile, {
      to: 'a@test.hominem.dev',
      otp: '111111',
      subject: 'Your sign-in code',
    });
    appendScriptedMailboxRecord(mailboxFile, {
      to: 'b@test.hominem.dev',
      otp: '222222',
      subject: 'Your sign-in code',
    });
    appendScriptedMailboxRecord(mailboxFile, {
      to: 'a@test.hominem.dev',
      otp: '333333',
      subject: 'Your sign-in code',
    });

    expect(readLatestScriptedOtp(mailboxFile, 'a@test.hominem.dev')?.otp).toBe('333333');
    expect(readLatestScriptedOtp(mailboxFile, 'b@test.hominem.dev')?.otp).toBe('222222');
    expect(readLatestScriptedOtp(mailboxFile, 'c@test.hominem.dev')).toBeNull();
  });

  it('skips records without an OTP and malformed lines', () => {
    appendScriptedMailboxRecord(mailboxFile, {
      to: 'a@test.hominem.dev',
      otp: '111111',
      subject: 'Your sign-in code',
    });
    appendScriptedMailboxRecord(mailboxFile, {
      to: 'a@test.hominem.dev',
      otp: null,
      subject: 'Your sign-in code',
    });

    expect(readLatestScriptedOtp(mailboxFile, 'a@test.hominem.dev')?.otp).toBe('111111');
  });
});
