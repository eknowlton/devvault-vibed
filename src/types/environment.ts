export interface AppEnvironment {
  id: string;
  name: string;
  color: string; // Hex color for badge (e.g. #3fb950, #d29922, #f85149)
  description?: string;
  variables: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export type VariableSource = 'user' | 'environment' | 'default' | 'empty';

export interface ParameterResolution {
  name: string;
  value: string;
  source: VariableSource;
  environmentName?: string;
  defaultValue?: string;
}
