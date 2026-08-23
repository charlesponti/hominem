import 'dotenv/config';

const apiUrl = (process.env.API_URL ?? 'http://localhost:4040').replace(/\/$/, '');
const sessionCookie = process.env.E2E_SESSION_COOKIE;
const chatId = process.env.SPEECH_SMOKE_CHAT_ID;
const messageId = process.env.SPEECH_SMOKE_MESSAGE_ID;

function fail(message: string): never {
  console.error(`speech smoke test failed: ${message}`);
  process.exit(1);
}

if (!sessionCookie || !chatId || !messageId) {
  fail('set E2E_SESSION_COOKIE, SPEECH_SMOKE_CHAT_ID, and SPEECH_SMOKE_MESSAGE_ID');
}

const response = await fetch(`${apiUrl}/api/chats/${chatId}/messages/${messageId}/speech`, {
  headers: { cookie: sessionCookie },
});

if (!response.ok || !response.body) {
  fail(`speech request returned HTTP ${response.status}`);
}

let audioBytes = 0;
for await (const chunk of response.body as AsyncIterable<Uint8Array>) {
  audioBytes += chunk.byteLength;
}

if (audioBytes === 0) fail('speech response contained no audio bytes');

const usageResponse = await fetch(`${apiUrl}/api/usage`, {
  headers: { cookie: sessionCookie },
});
if (!usageResponse.ok) fail(`usage request returned HTTP ${usageResponse.status}`);

const report = (await usageResponse.json()) as {
  byFeature?: Array<{ feature: string; requestCount: number; usageAvailableCount: number }>;
};
const speech = report.byFeature?.find((row) => row.feature === 'chat_speech');
if (!speech || speech.requestCount < 1) fail('usage report has no chat_speech request');

console.log(
  JSON.stringify({
    ok: true,
    audioBytes,
    speechRequests: speech.requestCount,
    usageAvailable: speech.usageAvailableCount,
  }),
);
