import { categories, tools, type ToolDefinition } from './tool-registry';

export type SearchResult = {
  tool: ToolDefinition;
  score: number;
  matchedOn: string;
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
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

export function searchTools(query: string, limit = 8): SearchResult[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return tools.filter((tool) => tool.featured).slice(0, limit).map((tool) => ({ tool, score: 1, matchedOn: 'featured' }));

  const queryTerms = normalizedQuery.split(' ').filter(Boolean);

  return searchIndex
    .map(({ tool, fields }) => {
      let score = 0;
      let matchedOn = '';
      for (const field of fields) {
        const normalizedField = field.value;
        if (normalizedField === normalizedQuery) {
          score += field.weight * 3;
          matchedOn ||= field.label;
        } else if (normalizedField.includes(normalizedQuery)) {
          score += field.weight * 2;
          matchedOn ||= field.label;
        }
        const matchingTerms = queryTerms.filter((term) => normalizedField.includes(term)).length;
        score += matchingTerms * field.weight;
        if (matchingTerms > 0) matchedOn ||= field.label;
      }
      return { tool, score, matchedOn };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.tool.title.localeCompare(b.tool.title))
    .slice(0, limit);
}
