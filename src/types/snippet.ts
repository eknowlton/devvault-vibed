export type SnippetType = 'command' | 'snippet' | 'recipe';

export type PlatformTarget = 'all' | 'linux' | 'macos' | 'windows';

export interface Snippet {
  id: string;
  title: string;
  content: string;
  type: SnippetType;
  language: string;
  description: string;
  tags: string[];
  category: string;
  platform: PlatformTarget;
  starred: boolean;
  isPrivate: boolean;
  copyCount: number;
  expectedOutput?: string;
  executionDuration?: string;
  simulatedPrompt?: string;
  createdAt: number;
  updatedAt: number;
}

export type SortOption = 'recentlyUpdated' | 'mostCopied' | 'alphabetical';

export interface FilterState {
  query: string;
  selectedCategory: string | null;
  selectedTag: string | null;
  typeFilter: SnippetType | 'all';
  platformFilter: PlatformTarget;
  starredOnly: boolean;
  visibilityFilter: 'all' | 'public' | 'private';
  sortBy: SortOption;
}

export interface ParameterPlaceholder {
  raw: string;
  name: string;
  defaultValue: string;
}
