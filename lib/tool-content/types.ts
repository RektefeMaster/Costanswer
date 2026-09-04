export type EditorialFaq = {
  question: string;
  answer: string[];
};

export type EditorialGlossaryTerm = {
  term: string;
  definition: string;
};

export type EditorialSection = {
  heading: string;
  paragraphs: string[];
};

/**
 * Indexable, tool-specific copy that sits under every calculator.
 * Keep it useful: how the math works, what the numbers mean, and the limits.
 */
export type ToolEditorial = {
  toolId: string;
  guide: {
    heading: string;
    lede: string;
    sections: EditorialSection[];
  };
  faq: EditorialFaq[];
  glossary: EditorialGlossaryTerm[];
  tips: string[];
  caveats: string[];
  /** Long-tail supporting notes (state, loan type, year, occupation) — not doorway pages. */
  longTail?: EditorialSection[];
};
