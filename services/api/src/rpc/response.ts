import type { z } from 'zod';

export function dataEnvelopeSchema<const T extends z.ZodType>(dataSchema: T) {
  return dataSchema.transform((data) => ({ data }));
}

export function parseDataEnvelope<const T extends z.ZodType>(
  dataSchema: T,
  data: unknown,
): z.infer<ReturnType<typeof dataEnvelopeSchema<T>>> {
  return dataEnvelopeSchema(dataSchema).parse(data);
}
