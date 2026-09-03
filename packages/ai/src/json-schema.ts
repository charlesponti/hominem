import { z } from 'zod';

type JsonSchemaObject = Record<string, unknown>;

function isJsonSchemaObject(value: unknown): value is JsonSchemaObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

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
    const properties = Object.fromEntries(
      Object.entries(result.properties).filter((entry): entry is [string, JsonSchemaObject] =>
        isJsonSchemaObject(entry[1]),
      ),
    );
    const allPropertyNames = Object.keys(properties);

    for (const propName of allPropertyNames) {
      const prop = properties[propName];
      if (!prop) continue;
      const wasOptional = !originalRequired.includes(propName);

      if (prop.type === 'object' && prop.properties) {
        const transformed = makeStructuredOutputCompatible(
          prop,
          isStringArray(prop.required) ? prop.required : [],
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
                items,
                isJsonSchemaObject(items) && isStringArray(items.required) ? items.required : [],
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
        items,
        isJsonSchemaObject(items) && isStringArray(items.required) ? items.required : [],
      );
    }
  }

  return result;
}

export function convertSchemaToJsonSchema(
  schema: z.ZodTypeAny,
  options: { forStructuredOutput?: boolean } = {},
): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-07' });
  delete jsonSchema.$schema;

  if (!options.forStructuredOutput) {
    return jsonSchema;
  }

  return makeStructuredOutputCompatible(
    jsonSchema,
    isStringArray(jsonSchema.required) ? jsonSchema.required : [],
  );
}
