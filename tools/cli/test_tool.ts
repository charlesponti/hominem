import { tool } from "ai";
import * as v from "valibot";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const testTool = tool({
  description: "Test tool",
  parameters: v.object({
    val: v.pipe(v.string(), v.description("A value")),
  }),
  execute: async ({ val }) => {
    return "Received " + val;
  },
});

async function main() {
  console.log("Defining tool...");
  const model = openai("gpt-4o-mini");
  try {
    const result = await generateText({
      model,
      messages: [{ role: "user", content: "Call the test tool with value 'hello'" }],
      tools: { testTool },
    });
    console.log("Result:", result.text);
    console.log("ToolCalls:", JSON.stringify(result.toolCalls));
  } catch (e: any) {
    console.error("Error Message:", e.message);
    if (e.requestBodyValues) {
      console.log("Tools Payload:", JSON.stringify(e.requestBodyValues.tools, null, 2));
    }
  }
}

main();
