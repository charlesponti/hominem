import {
  AgentRuntimeEventTag,
  defineHarness,
  type AgentHarness,
  type AgentRuntimeEvent,
  type HarnessInvokeOptions,
} from 'ori';

const event = (
  type: AgentRuntimeEventTag,
  payload: Record<string, unknown>,
  model: string,
): AgentRuntimeEvent => ({ type, payload, model, harness: 'hominem-chat' }) as AgentRuntimeEvent;

/** A plain OpenRouter chat-completion harness: no Codex tools, filesystem, or agent loop. */
const chatHarness: AgentHarness = defineHarness({
  name: 'hominem-chat',
  init(registrar) {
    registrar.registerPrompt(async function* (options: HarnessInvokeOptions) {
      const model = options.model ?? process.env.ORI_TARGET_MODEL ?? 'openai/gpt-4o-mini';
      const apiKey = options.env?.OPENROUTER_API_KEY ?? process.env.OPENROUTER_API_KEY;
      if (!apiKey) throw new Error('OPENROUTER_API_KEY is required for chat evaluation');

      yield event(AgentRuntimeEventTag.RunStarted, { prompt: options.prompt, model }, model);
      yield event(AgentRuntimeEventTag.SessionStarted, {}, model);
      yield event(AgentRuntimeEventTag.TurnStarted, { prompt: options.prompt }, model);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
            { role: 'user', content: options.prompt },
          ],
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        const failure = { failure: { message: `OpenRouter request failed (${response.status})` } };
        yield event(AgentRuntimeEventTag.TurnFailed, failure, model);
        yield event(AgentRuntimeEventTag.SessionFailed, { failure: { message: detail } }, model);
        return;
      }

      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      const content = body.choices?.[0]?.message?.content ?? '';
      if (content) yield event(AgentRuntimeEventTag.AssistantTextDelta, { delta: content }, model);
      yield event(AgentRuntimeEventTag.TurnSucceeded, {}, model);
      yield event(AgentRuntimeEventTag.SessionSucceeded, {}, model);
    });
  },
});

export default chatHarness;
