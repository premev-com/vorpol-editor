/**
 * All file extensions that Vorpol treats as code files
 * (syntax highlighting via CodeMirror, no preview).
 *
 * Shared between main process (file open dialogs) and renderer (file-type detection).
 * Keep in sync with the CodeMirror language packs installed in the app.
 */
export const CODE_EXTENSIONS = [
  "js",
  "jsx",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "py",
  "pyw",
  "rs",
  "go",
  "java",
  "c",
  "cpp",
  "cc",
  "cxx",
  "h",
  "hpp",
  "cs",
  "rb",
  "php",
  "swift",
  "kt",
  "scala",
  "lua",
  "r",
  "sql",
  "sh",
  "bash",
  "zsh",
  "fish",
  "ps1",
  "bat",
  "cmd",
  "html",
  "htm",
  "css",
  "scss",
  "less",
  "json",
  "jsonc",
  "xml",
  "yaml",
  "yml",
  "toml",
  "ini",
  "cfg",
  "conf",
  "dockerfile",
  "gitignore",
  "env",
  "graphql",
  "gql",
  "vue",
  "svelte",
  "astro",
  "prisma",
  "proto",
] as const;

export const OTHER_EXTENSIONS = ["txt", "md", "docx"] as const;

export const FILE_KIND_MAP: Record<string, string> = {
  md: "markdown",
  txt: "text",
  docx: "word",
};
