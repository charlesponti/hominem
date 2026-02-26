import { tool } from "ai";
import { z } from "zod";

async function debugAI() {
  try {
    const { generateText } = await import("ai");
    const { createLanguageModel } = await import("./src/core/agent/model");

    const model = await createLanguageModel(undefined, "mock-model");

    console.log("Model provider:", model.provider);

    const tools = {
      read_file_preview: tool({
        description: "Read file",
        parameters: z.object({
          filePath: z.string().describe("path"),
        }),
        execute: async () => "content",
      }),
    };

    console.log("--- Testing Full Sequence ---");
    try {
      await generateText({
        model: model,
        messages: [
          { role: "user", content: "Classify..." },
          {
            role: "assistant",
            content: [
              { type: "text", text: "reading..." },
              {
                type: "tool-call",
                toolCallId: "call_mock_123",
                toolName: "read_file_preview",
                args: { filePath: "foo" },
              },
            ],
          },
          {
            role: "tool",
            content: [
              {
                type: "tool-result",
                toolCallId: "call_mock_123",
                toolName: "read_file_preview",
                result: { content: "content" },
              },
            ],
          },
        ],
        tools: tools,
      });
      console.log("Full Sequence: PASS");
    } catch (e) {
      console.log("Full Sequence: FAIL");
      // console.log(JSON.stringify(e, null, 2)); // dump error
      const fs = require("fs");
      fs.writeFileSync("debug-error.json", JSON.stringify(e, null, 2));
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

debugAI();
