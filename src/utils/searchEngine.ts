import { type FilterState, type Snippet } from '../types/snippet';

export function filterAndSortSnippets(
  snippets: Snippet[],
  filters: FilterState
): Snippet[] {
  const queryTokens = filters.query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  // 1. Filter out snippets that don't match criteria
  const filtered = snippets.filter((item) => {
    // Type filter
    if (filters.typeFilter !== 'all' && item.type !== filters.typeFilter) {
      return false;
    }

    // Platform filter
    if (
      filters.platformFilter !== 'all' &&
      item.platform !== 'all' &&
      item.platform !== filters.platformFilter
    ) {
      return false;
    }

    // Starred filter
    if (filters.starredOnly && !item.starred) {
      return false;
    }

    // Visibility filter (public vs private)
    if (filters.visibilityFilter === 'public' && item.isPrivate) {
      return false;
    }
    if (filters.visibilityFilter === 'private' && !item.isPrivate) {
      return false;
    }

    // Category filter
    if (
      filters.selectedCategory &&
      item.category.toLowerCase() !== filters.selectedCategory.toLowerCase()
    ) {
      return false;
    }

    // Tag filter
    if (
      filters.selectedTag &&
      !item.tags.some(
        (t) => t.toLowerCase() === filters.selectedTag!.toLowerCase()
      )
    ) {
      return false;
    }

    // Full-text query tokens matching (all tokens must match at least one field)
    if (queryTokens.length > 0) {
      const titleLower = item.title.toLowerCase();
      const contentLower = item.content.toLowerCase();
      const descLower = item.description.toLowerCase();
      const langLower = item.language.toLowerCase();
      const categoryLower = item.category.toLowerCase();
      const tagsJoined = item.tags.join(' ').toLowerCase();

      for (const token of queryTokens) {
        // Strip leading '#' if user typed '#docker'
        const cleanToken = token.startsWith('#') ? token.slice(1) : token;
        const matches =
          titleLower.includes(cleanToken) ||
          contentLower.includes(cleanToken) ||
          tagsJoined.includes(cleanToken) ||
          descLower.includes(cleanToken) ||
          langLower.includes(cleanToken) ||
          categoryLower.includes(cleanToken);

        if (!matches) {
          return false;
        }
      }
    }

    return true;
  });

  // 2. Sort results
  return filtered.sort((a, b) => {
    // If there is an active search query, sort primarily by relevance score
    if (queryTokens.length > 0) {
      const scoreA = calculateRelevance(a, queryTokens);
      const scoreB = calculateRelevance(b, queryTokens);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
    }

    // Secondary / Default sorting
    switch (filters.sortBy) {
      case 'mostCopied':
        return b.copyCount - a.copyCount;
      case 'alphabetical':
        return a.title.localeCompare(b.title);
      case 'recentlyUpdated':
      default:
        return b.updatedAt - a.updatedAt;
    }
  });
}

function calculateRelevance(snippet: Snippet, tokens: string[]): number {
  let score = 0;
  const title = snippet.title.toLowerCase();
  const content = snippet.content.toLowerCase();
  const tags = snippet.tags.map((t) => t.toLowerCase());
  const category = snippet.category.toLowerCase();

  for (const token of tokens) {
    const cleanToken = token.startsWith('#') ? token.slice(1) : token;

    // Exact title match gets huge boost
    if (title === cleanToken) score += 200;
    else if (title.startsWith(cleanToken)) score += 100;
    else if (title.includes(cleanToken)) score += 50;

    // Exact tag match
    if (tags.includes(cleanToken)) score += 60;
    else if (tags.some((t) => t.includes(cleanToken))) score += 30;

    // Category match
    if (category === cleanToken) score += 40;

    // Content match
    if (content.includes(cleanToken)) score += 25;
  }

  // Starred items get a slight relevance tie-breaker boost
  if (snippet.starred) score += 5;

  return score;
}
