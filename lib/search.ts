import { categories, getToolQualityScore, tools, type CategoryId, type ToolDefinition } from './tool-registry';

export type SearchResult = {
  tool: ToolDefinition;
  score: number;
  matchedOn: string;
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'can', 'calculator', 'do', 'does', 'for', 'from',
  'how', 'i', 'in', 'is', 'it', 'many', 'me', 'much', 'my', 'need', 'of', 'on',
  'or', 'the', 'to', 'tool', 'want', 'what', 'which', 'with', 'you', 'your',
]);

function meaningfulTerms(value: string): string[] {
  return [...new Set(normalize(value).split(' ').filter((term) => term.length > 1 && !STOP_WORDS.has(term)))];
}

function fieldMatchesTerm(field: string, term: string): boolean {
  return field.split(' ').some((token) => token === term || (term.length >= 3 && token.startsWith(term)));
}

const searchIndex = tools.map((tool) => ({
  tool,
  fields: [
    { value: normalize(tool.title), weight: 10, label: 'title' },
    { value: normalize(tool.shortTitle), weight: 9, label: 'name' },
    ...tool.searchTerms.map((value) => ({ value: normalize(value), weight: 7, label: 'intent' })),
    { value: normalize(categories[tool.category].name), weight: 4, label: 'category' },
    { value: normalize(tool.description), weight: 2, label: 'description' },
  ],
}));

export function getPopularTools(limit = 8): ToolDefinition[] {
  const ranked = [...tools].sort((left, right) => {
    const scoreGap = getToolQualityScore(right) - getToolQualityScore(left);
    return scoreGap !== 0 ? scoreGap : left.title.localeCompare(right.title);
  });
  const picked: ToolDefinition[] = [];
  const seenCategories = new Set<CategoryId>();

  for (const tool of ranked) {
    if (seenCategories.has(tool.category)) continue;
    picked.push(tool);
    seenCategories.add(tool.category);
    if (picked.length === limit) return picked;
  }

  for (const tool of ranked) {
    if (picked.includes(tool)) continue;
    picked.push(tool);
    if (picked.length === limit) return picked;
  }

  return picked;
}

export function searchTools(query: string, limit = 8): SearchResult[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return getPopularTools(limit).map((tool) => ({ tool, score: 1, matchedOn: 'featured' }));
  }

  const queryTerms = meaningfulTerms(normalizedQuery);
  if (queryTerms.length === 0) return [];

  return searchIndex
    .map(({ tool, fields }) => {
      let score = 0;
      let matchedOn = '';
      const matchedTerms = new Set<string>();
      let bestPhraseScore = 0;
      for (const field of fields) {
        const normalizedField = field.value;
        let phraseScore = 0;
        if (normalizedField === normalizedQuery) {
          phraseScore = field.weight * 3;
        } else if (normalizedField.includes(normalizedQuery)) {
          phraseScore = field.weight * 2;
        }
        if (phraseScore > bestPhraseScore) {
          bestPhraseScore = phraseScore;
          matchedOn = field.label;
        }
      }
      score += bestPhraseScore;
      for (const term of queryTerms) {
        const bestField = fields
          .filter((field) => fieldMatchesTerm(field.value, term))
          .sort((left, right) => right.weight - left.weight)[0];
        if (!bestField) continue;
        matchedTerms.add(term);
        score += bestField.weight;
        matchedOn ||= bestField.label;
      }
      const coverage = matchedTerms.size / queryTerms.length;
      return { tool, score: coverage >= 0.6 && score >= 7 ? score : 0, matchedOn };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.tool.title.localeCompare(b.tool.title))
    .slice(0, limit);
}
