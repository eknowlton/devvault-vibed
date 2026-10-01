import { ParameterPlaceholder } from '../types/snippet';

const PARAM_REGEX = /\{\{([a-zA-Z0-9_-]+)(?::([^}]*))?\}\}/g;

/**
 * Extracts all unique parameter placeholders from a snippet content.
 * Example formats:
 * {{PORT}} -> name: PORT, defaultValue: ""
 * {{PORT:8080}} -> name: PORT, defaultValue: "8080"
 */
export function extractPlaceholders(content: string): ParameterPlaceholder[] {
  const placeholders: ParameterPlaceholder[] = [];
  const seen = new Set<string>();

  const matches = content.matchAll(PARAM_REGEX);
  for (const match of matches) {
    const raw = match[0];
    const name = match[1];
    const defaultValue = match[2] !== undefined ? match[2] : '';

    if (!seen.has(name)) {
      seen.add(name);
      placeholders.push({ raw, name, defaultValue });
    }
  }

  return placeholders;
}

/**
 * Checks if the content string has any {{PARAM}} placeholders.
 */
export function hasPlaceholders(content: string): boolean {
  PARAM_REGEX.lastIndex = 0;
  return PARAM_REGEX.test(content);
}

/**
 * Substitutes placeholders with user-provided parameter values.
 * If a value is empty or not provided, falls back to defaultValue or empty string.
 */
export function renderTemplate(
  content: string,
  values: Record<string, string>
): string {
  return content.replace(PARAM_REGEX, (_fullMatch, name, defaultValue) => {
    const provided = values[name];
    if (provided !== undefined && provided.trim() !== '') {
      return provided;
    }
    return defaultValue !== undefined ? defaultValue : '';
  });
}
