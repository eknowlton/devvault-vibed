import { type ParameterPlaceholder } from '../types/snippet';
import { type ParameterResolution } from '../types/environment';

const PARAM_REGEX = /\{\{([a-zA-Z0-9_-]+)(?::([^}]*))?\}\}/g;

/**
 * Extracts all unique parameter placeholders from a snippet content.
 * Example formats:
 * {{PORT}} -> name: PORT, defaultValue: ""
 * {{PORT:8080}} -> name: PORT, defaultValue: "8080"
 */
export function extractPlaceholders(content: string): ParameterPlaceholder[] {
  PARAM_REGEX.lastIndex = 0;
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
 * Resolves a parameter's value following the precedence hierarchy:
 * 1. User values (explicit user override in filler modal)
 * 2. Active environment variable value
 * 3. Snippet default value (inline {{PARAM:default}})
 * 4. Empty fallback string ("")
 */
export function resolveParameter(
  name: string,
  defaultValue: string = '',
  userValues: Record<string, string> = {},
  envValues: Record<string, string> = {},
  environmentName?: string
): ParameterResolution {
  const userVal = userValues[name];
  if (userVal !== undefined && userVal.trim() !== '') {
    return {
      name,
      value: userVal,
      source: 'user',
      defaultValue,
      environmentName,
    };
  }

  const envVal = envValues[name];
  if (envVal !== undefined && envVal.trim() !== '') {
    return {
      name,
      value: envVal,
      source: 'environment',
      defaultValue,
      environmentName,
    };
  }

  if (defaultValue !== undefined && defaultValue.trim() !== '') {
    return {
      name,
      value: defaultValue,
      source: 'default',
      defaultValue,
      environmentName,
    };
  }

  return {
    name,
    value: '',
    source: 'empty',
    defaultValue,
    environmentName,
  };
}

/**
 * Returns the resolved status and values for an array of placeholders.
 */
export function getResolvedParameters(
  placeholders: ParameterPlaceholder[],
  userValues: Record<string, string> = {},
  envValues: Record<string, string> = {},
  environmentName?: string
): ParameterResolution[] {
  return placeholders.map((p) =>
    resolveParameter(p.name, p.defaultValue, userValues, envValues, environmentName)
  );
}

/**
 * Substitutes placeholders with user-provided parameter values and active environment variables.
 * Maintains backwards compatibility if envValues is omitted.
 */
export function renderTemplate(
  content: string,
  values: Record<string, string> = {},
  envValues: Record<string, string> = {}
): string {
  PARAM_REGEX.lastIndex = 0;
  return content.replace(PARAM_REGEX, (_fullMatch, name, defaultValue) => {
    const defaultVal = defaultValue !== undefined ? defaultValue : '';
    const resolution = resolveParameter(name, defaultVal, values, envValues);
    return resolution.value;
  });
}

/**
 * Resolves available environment variables in a snippet/command content.
 * When an environment is active and a variable is available in envValues,
 * it replaces the placeholder with the environment variable's value.
 * If a variable is NOT defined in envValues, the placeholder is preserved as-is.
 *
 * Example:
 * Content: "curl {{URL:http://localhost}} -p {{PORT:8080}} {{FLAG}}"
 * envValues: { PORT: "3000" }
 * Result: "curl {{URL:http://localhost}} -p 3000 {{FLAG}}"
 */
export function resolveEnvironmentVariables(
  content: string,
  envValues: Record<string, string> = {}
): string {
  if (!content || !envValues || Object.keys(envValues).length === 0) {
    return content;
  }
  PARAM_REGEX.lastIndex = 0;
  return content.replace(PARAM_REGEX, (raw, name) => {
    const envVal = envValues[name];
    if (envVal !== undefined && envVal.trim() !== '') {
      return envVal;
    }
    return raw;
  });
}

/**
 * Returns the list of parameter names from content that were matched and available in envValues.
 */
export function getAppliedEnvironmentVariables(
  content: string,
  envValues: Record<string, string> = {}
): string[] {
  if (!content || !envValues || Object.keys(envValues).length === 0) {
    return [];
  }
  const placeholders = extractPlaceholders(content);
  const applied: string[] = [];
  for (const p of placeholders) {
    const val = envValues[p.name];
    if (val !== undefined && val.trim() !== '') {
      applied.push(p.name);
    }
  }
  return applied;
}

