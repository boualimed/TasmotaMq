/**
 * Extracts a value from a JSON object using a dot-notation path
 * @param jsonData The source JSON object
 * @param path Dot-notation path (e.g., 'AM2301.Temperature')
 * @returns The extracted value or null if not found
 */
export function extractJsonValue(jsonData: any, path: string): any {
  if (!path) return jsonData;

  const keys = path.split('.');
  let value = jsonData;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return null;
    }
  }

  return value;
}

/**
 * Flattens a nested object into a single-level object with dot-notation keys
 * @param obj The object to flatten
 * @param prefix Optional prefix for keys
 * @returns Flattened object
 */
export function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }
  }

  return flattened;
}

/**
 * Safely parses JSON, returns original string if parsing fails
 * @param payload String to parse
 * @returns Parsed object or original string
 */
export function safeJsonParse(payload: string): any {
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}