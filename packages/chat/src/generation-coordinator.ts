/**
 * The Hominem boundary around an LLM-backed generation.
 *
 * The model session owns provider mechanics (stream parsing, tool-call
 * assembly, and model turns). Hominem owns lifecycle, authorization,
 * persistence, and delivery. Keeping this contract here makes the API an
 * adapter instead of the owner of chat semantics.
 */

import type { GenerationStartContext } from './generation-events';
import { runGenerationWithPorts, type GenerationPorts } from './generation-interpreter';
import type { GenerationInput, GenerationState } from './generation-machine';

export type GenerationCoordinator = {
  run: (input: {
    generationId: string;
    context: GenerationStartContext;
    ports: GenerationPorts;
    initialInput?: GenerationInput;
  }) => Promise<GenerationState>;
};

/**
 * Builds the single application entry point for a generation.
 *
 * The coordinator intentionally contains no provider or persistence logic.
 * Those concerns are supplied as ports and are executed by the machine's
 * sequential interpreter, which keeps command ordering deterministic.
 */
export function createGenerationCoordinator(): GenerationCoordinator {
  return {
    run: (input) =>
      runGenerationWithPorts({
        generationId: input.generationId,
        startContext: input.context,
        ports: input.ports,
        initialInput: input.initialInput,
      }),
  };
}
