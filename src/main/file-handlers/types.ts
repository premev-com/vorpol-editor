export interface FileResult {
  path: string;
  name: string;
  content: string;
  previewHtml?: string;
  /** Which preview styling to use */
  previewKind?: "markdown" | "docx";
}

export interface FileHandler {
  extensions: readonly string[];
  read(filePath: string): Promise<FileResult>;
}
