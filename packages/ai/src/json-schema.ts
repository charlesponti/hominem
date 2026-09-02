import { z } from 'zod';

type JsonSchemaObject = Record<string, unknown>;

/**
 * OpenAI-style strict structured outputs require every property to be listed in
 * `required` (optional fields become nullable instead of omitted) and
 * `additionalProperties: false` on every object, recursively.
 */
function makeStructuredOutputCompatible(
  schema: JsonSchemaObject,
  originalRequired: string[] = [],
): JsonSchemaObject {
  const result: JsonSchemaObject = { ...schema };

  if (result.type === 'object' && result.properties) {
    const properties = { ...(result.properties as Record<string, JsonSchemaObject>) };
    const allPropertyNames = Object.keys(properties);

    for (const propName of allPropertyNames) {
      const prop = properties[propName];
      if (!prop) continue;
      const wasOptional = !originalRequired.includes(propName);

      if (prop.type === 'object' && prop.properties) {
        const transformed = makeStructuredOutputCompatible(
          prop,
          (prop.required as string[] | undefined) ?? [],
        );
        properties[propName] = wasOptional
          ? { ...transformed, type: ['object', 'null'] }
          : transformed;
      } else if (prop.type === 'array' && prop.items) {
        const items = Array.isArray(prop.items) ? prop.items[0] : prop.items;
        const transformed = {
          ...prop,
          items: items
            ? makeStructuredOutputCompatible(
                items as JsonSchemaObject,
                ((items as JsonSchemaObject).required as string[] | undefined) ?? [],
              )
            : prop.items,
        };
        properties[propName] = wasOptional
          ? { ...transformed, type: ['array', 'null'] }
          : transformed;
      } else if (wasOptional) {
        if (prop.type && !Array.isArray(prop.type)) {
          properties[propName] = { ...prop, type: [prop.type, 'null'] };
        } else if (Array.isArray(prop.type) && !prop.type.includes('null')) {
          properties[propName] = { ...prop, type: [...prop.type, 'null'] };
        }
      }
    }

    result.properties = properties;
    result.required = allPropertyNames;
    result.additionalProperties = false;
  }

  if (result.type === 'array' && result.items) {
    const items = Array.isArray(result.items) ? result.items[0] : result.items;
    if (items) {
      result.items = makeStructuredOutputCompatible(
        items as JsonSchemaObject,
        ((items as JsonSchemaObject).required as string[] | undefined) ?? [],
      );
    }
  }

  return result;
}

export function convertSchemaToJsonSchema(
  schema: z.ZodTypeAny,
  options: { forStructuredOutput?: boolean } = {},
): Record<string, unknown> {
  const { $schema, ...jsonSchema } = z.toJSONSchema(schema, { target: 'draft-07' });

  if (!options.forStructuredOutput) {
    return jsonSchema;
  }

  return makeStructuredOutputCompatible(
    jsonSchema,
    (jsonSchema.required as string[] | undefined) ?? [],
  );
}
