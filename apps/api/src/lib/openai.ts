import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import assert from "node:assert";
import { OpenAI } from "openai";

const { OPENAI_API_KEY } = process.env;

assert(OPENAI_API_KEY, "Missing OPENAI_API_KEY");

export const openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });

export const openaiModelStreaming = new ChatOpenAI({
	modelName: "gpt-4o-mini",
	streaming: true,
	temperature: 0.7,
	openAIApiKey: OPENAI_API_KEY,
});

export const openaiModel = new ChatOpenAI({
	modelName: "gpt-4o-mini",
	temperature: 0.7,
	openAIApiKey: OPENAI_API_KEY,
});

export const openaiEmbeddings = new OpenAIEmbeddings();
