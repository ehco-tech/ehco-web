// src/lib/utils/htmlUtils.tsx

/**
 * Render highlighted text from Algolia search results
 */
export const renderHighlightedText = (highlightedValue: string) => {
  return <span dangerouslySetInnerHTML={{ __html: highlightedValue }} />;
};
