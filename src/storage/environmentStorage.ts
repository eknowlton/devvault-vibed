import AsyncStorage from '@react-native-async-storage/async-storage';
import { type AppEnvironment } from '../types/environment';

export const SEED_ENVIRONMENTS: AppEnvironment[] = [
  {
    id: 'env-dev',
    name: 'Development',
    color: '#3fb950', // Emerald Green
    description: 'Local development environment with local hostnames and dev namespaces',
    variables: {
      ENV: 'development',
      PORT: '3000',
      LOCAL_PORT: '3000',
      HOST: 'localhost',
      API_URL: 'http://localhost:3000',
      NAMESPACE: 'dev',
      CONTAINER_NAME: 'web_dev',
      DEPLOYMENT_NAME: 'api-dev',
      MAIN_BRANCH: 'main',
    },
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'env-staging',
    name: 'Staging',
    color: '#d29922', // Amber / Gold
    description: 'Pre-production staging cluster and QA validation hostnames',
    variables: {
      ENV: 'staging',
      PORT: '8080',
      LOCAL_PORT: '8080',
      HOST: 'staging.internal',
      API_URL: 'https://staging-api.internal',
      NAMESPACE: 'staging',
      CONTAINER_NAME: 'web_staging',
      DEPLOYMENT_NAME: 'api-staging',
      MAIN_BRANCH: 'staging',
    },
    createdAt: Date.now() - 86400000 * 6,
    updatedAt: Date.now() - 86400000 * 6,
  },
  {
    id: 'env-prod',
    name: 'Production',
    color: '#f85149', // Coral Red
    description: 'Live production cloud infrastructure and high-availability endpoints',
    variables: {
      ENV: 'production',
      PORT: '443',
      LOCAL_PORT: '443',
      HOST: 'prod.internal',
      API_URL: 'https://api.internal',
      NAMESPACE: 'production',
      CONTAINER_NAME: 'web_prod',
      DEPLOYMENT_NAME: 'api-prod',
      MAIN_BRANCH: 'main',
    },
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 5,
  },
];

const STORAGE_KEY = '@devvault_environments_v1';
const ACTIVE_ENV_KEY = '@devvault_active_env_id_v1';
const INITIALIZED_KEY = '@devvault_env_initialized_v1';

/**
 * Retrieves all stored environments. Seeding happens automatically on first launch.
 */
export async function getStoredEnvironments(): Promise<AppEnvironment[]> {
  try {
    const isInitialized = await AsyncStorage.getItem(INITIALIZED_KEY);
    const rawData = await AsyncStorage.getItem(STORAGE_KEY);

    if (!isInitialized || !rawData) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ENVIRONMENTS));
      await AsyncStorage.setItem(ACTIVE_ENV_KEY, SEED_ENVIRONMENTS[0].id);
      await AsyncStorage.setItem(INITIALIZED_KEY, 'true');
      return SEED_ENVIRONMENTS;
    }

    const parsed: AppEnvironment[] = JSON.parse(rawData);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_ENVIRONMENTS;
  } catch (err) {
    console.error('Failed to read environments from storage:', err);
    return SEED_ENVIRONMENTS;
  }
}

/**
 * Persists the environment list to storage.
 */
export async function persistEnvironments(environments: AppEnvironment[]): Promise<boolean> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(environments));
    return true;
  } catch (err) {
    console.error('Failed to persist environments:', err);
    return false;
  }
}

/**
 * Gets the ID of the currently active app-wide environment.
 */
export async function getActiveEnvironmentId(): Promise<string> {
  try {
    const activeId = await AsyncStorage.getItem(ACTIVE_ENV_KEY);
    if (activeId) return activeId;
    return SEED_ENVIRONMENTS[0].id;
  } catch {
    return SEED_ENVIRONMENTS[0].id;
  }
}

/**
 * Sets the active app-wide environment ID.
 */
export async function setActiveEnvironmentId(id: string): Promise<boolean> {
  try {
    await AsyncStorage.setItem(ACTIVE_ENV_KEY, id);
    return true;
  } catch (err) {
    console.error('Failed to save active environment ID:', err);
    return false;
  }
}

/**
 * Adds a new environment or updates an existing one.
 */
export async function addOrUpdateEnvironment(
  env: AppEnvironment
): Promise<AppEnvironment[]> {
  const current = await getStoredEnvironments();
  const existingIdx = current.findIndex((e) => e.id === env.id);

  let updated: AppEnvironment[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = {
      ...env,
      updatedAt: Date.now(),
    };
  } else {
    updated = [
      ...current,
      {
        ...env,
        createdAt: env.createdAt || Date.now(),
        updatedAt: Date.now(),
      },
    ];
  }

  await persistEnvironments(updated);
  return updated;
}

/**
 * Deletes an environment by ID. If active environment is deleted, switches to the first remaining one.
 */
export async function deleteEnvironment(id: string): Promise<{
  environments: AppEnvironment[];
  activeId: string;
}> {
  const current = await getStoredEnvironments();
  const updated = current.filter((e) => e.id !== id);
  const remaining = updated.length > 0 ? updated : SEED_ENVIRONMENTS;

  await persistEnvironments(remaining);

  const activeId = await getActiveEnvironmentId();
  let nextActiveId = activeId;
  if (activeId === id) {
    nextActiveId = remaining[0].id;
    await setActiveEnvironmentId(nextActiveId);
  }

  return { environments: remaining, activeId: nextActiveId };
}

/**
 * Resets all environments back to default seeds.
 */
export async function resetEnvironmentsToSeed(): Promise<AppEnvironment[]> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ENVIRONMENTS));
  await AsyncStorage.setItem(ACTIVE_ENV_KEY, SEED_ENVIRONMENTS[0].id);
  return SEED_ENVIRONMENTS;
}

/**
 * Exports all environments as a JSON string.
 */
export async function exportEnvironmentsToJson(): Promise<string> {
  const envs = await getStoredEnvironments();
  return JSON.stringify(envs, null, 2);
}

/**
 * Imports environments from a JSON string.
 */
export async function importEnvironmentsFromJson(
  jsonString: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      return { success: false, error: 'Environment data must be a JSON array' };
    }

    const current = await getStoredEnvironments();
    const existingIds = new Set(current.map((e) => e.id));

    const validated: AppEnvironment[] = [];
    for (const item of parsed) {
      if (item && item.name && typeof item.variables === 'object') {
        const id = item.id && !existingIds.has(item.id)
          ? item.id
          : `env-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        validated.push({
          id,
          name: String(item.name),
          color: typeof item.color === 'string' ? item.color : '#58a6ff',
          description: typeof item.description === 'string' ? item.description : '',
          variables: { ...item.variables },
          createdAt: Number(item.createdAt) || Date.now(),
          updatedAt: Number(item.updatedAt) || Date.now(),
        });
      }
    }

    if (validated.length === 0) {
      return { success: false, error: 'No valid environment configurations found in JSON' };
    }

    const merged = [...current, ...validated];
    await persistEnvironments(merged);
    return { success: true, count: validated.length };
  } catch (err: any) {
    return { success: false, error: err.message || 'Invalid JSON syntax' };
  }
}
