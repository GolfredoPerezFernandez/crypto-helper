/**
 * Simple function to parse basic Markdown syntax
 * Focuses primarily on bold text with double asterisks
 */
export function parseMarkdown(text: string): { __html: string } {
  if (!text) return { __html: '' };
  
  // Parse bold text (**text**)
  let parsedText = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Parse line breaks
  parsedText = parsedText.replace(/\n/g, '<br />');
  
  return { __html: parsedText };
}
