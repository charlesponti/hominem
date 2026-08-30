/**
 * Minimal client for the tsserver stdin/stdout protocol — the same
 * protocol VS Code's TypeScript extension (and most editors' TS
 * integrations) use to talk to `tsserver.js`. Driving it directly gives
 * real hover/diagnostics/references answers without needing a GUI editor.
 *
 * Protocol note (easy to get backwards): requests written TO tsserver are
 * plain newline-delimited JSON, no framing. Responses/events read FROM
 * tsserver ARE `Content-Length`-framed, like LSP.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export function resolveTsserverPath(root) {
  return path.join(root, 'node_modules/typescript/lib/tsserver.js');
}

export class TsServerClient {
  constructor(root, { logStderr = false } = {}) {
    this.proc = spawn(process.execPath, [resolveTsserverPath(root)], {
      cwd: root,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (logStderr) this.proc.stderr.on('data', (d) => process.stderr.write(`[tsserver] ${d}`));
    this.buffer = Buffer.alloc(0);
    this.seq = 0;
    this.pendingResponses = new Map();
    this.pendingEvents = new Map();
    this.proc.stdout.on('data', (chunk) => this.onData(chunk));
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;
      const header = this.buffer.subarray(0, headerEnd).toString('utf8');
      const match = header.match(/Content-Length: (\d+)/i);
      if (!match) {
        const nl = this.buffer.indexOf('\n');
        if (nl === -1) return;
        this.buffer = this.buffer.subarray(nl + 1);
        continue;
      }
      const contentLength = Number(match[1]);
      const bodyStart = headerEnd + 4;
      if (this.buffer.length < bodyStart + contentLength) return;
      const body = this.buffer.subarray(bodyStart, bodyStart + contentLength).toString('utf8');
      this.buffer = this.buffer.subarray(bodyStart + contentLength);
      this.handleMessage(JSON.parse(body));
    }
  }

  handleMessage(msg) {
    if (msg.type === 'response') {
      const resolver = this.pendingResponses.get(msg.request_seq);
      if (resolver) {
        this.pendingResponses.delete(msg.request_seq);
        resolver(msg);
      }
      return;
    }
    if (msg.type === 'event') {
      const waiters = this.pendingEvents.get(msg.event);
      if (waiters && waiters.length > 0) waiters.shift()(msg);
    }
  }

  waitForEvent(eventName, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`timeout waiting for ${eventName}`)),
        timeoutMs,
      );
      const list = this.pendingEvents.get(eventName) ?? [];
      list.push((msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
      this.pendingEvents.set(eventName, list);
    });
  }

  send(command, args) {
    const seq = ++this.seq;
    const payload = JSON.stringify({ seq, type: 'request', command, arguments: args });
    this.proc.stdin.write(payload + '\n');
    return seq;
  }

  request(command, args, timeoutMs = 30000) {
    const seq = this.send(command, args);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingResponses.delete(seq);
        reject(new Error(`timeout waiting for response to ${command}`));
      }, timeoutMs);
      this.pendingResponses.set(seq, (msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
    });
  }

  async open(file, { waitForProjectLoad = true, timeoutMs = 30000 } = {}) {
    this.send('open', { file });
    if (waitForProjectLoad) {
      try {
        await this.waitForEvent('projectLoadingFinish', timeoutMs);
      } catch {
        // Not every config emits this (e.g. no project graph to load).
      }
    }
  }

  kill() {
    this.proc.kill();
  }
}

export function rssMb(pid) {
  try {
    const status = readFileSync(`/proc/${pid}/status`, 'utf8');
    const match = status.match(/VmRSS:\s+(\d+) kB/);
    return match ? Math.round(Number(match[1]) / 1024) : null;
  } catch {
    return null;
  }
}
