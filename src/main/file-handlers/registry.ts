import type { FileHandler, FileResult } from "./types";
import { markdownHandler } from "./markdown";
import { textHandler } from "./text";
import { docxHandler } from "./docx";
import { codeHandler } from "./code";

const handlers: FileHandler[] = [
  markdownHandler,
  textHandler,
  docxHandler,
  codeHandler,
];

/** All supported extensions (lowercase, no dot). */
export const supportedExtensions: string[] = handlers.flatMap(
  (h) => h.extensions,
);

/** Check if a file path is a supported type. */
export function isSupportedFile(filePath: string): boolean {
  const ext = filePath.toLowerCase().split(".").pop();
  return ext != null && supportedExtensions.includes(ext);
}

/** Read a file using the appropriate handler. */
export async function readFile(filePath: string): Promise<FileResult> {
  const ext = filePath.toLowerCase().split(".").pop() ?? "";
  const handler = handlers.find((h) => h.extensions.includes(ext));
  if (!handler) {
    throw new Error(`Unsupported file type: ${filePath}`);
  }
  return handler.read(filePath);
}
