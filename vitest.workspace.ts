import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
	"./apps/api/vitest.config.mts",
	"./apps/scratchpad/vitest.config.mts",
	"./packages/utils/vitest.config.mts",
]);
