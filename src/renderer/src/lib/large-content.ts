/**
 * Safe string operations for large content.
 * Avoids O(n) allocations like split/trim on multi-MB strings.
 */

/** Get the first line of content without allocating a full split array. */
export function firstLine(content: string, maxLen = 40): string {
  if (!content) return "Untitled";
  const idx = content.indexOf("\n");
  let line = idx === -1 ? content : content.slice(0, idx);
  line = line.trimStart();
  if (!line) return "Untitled";
  return line.length > maxLen ? line.slice(0, maxLen) : line;
}
