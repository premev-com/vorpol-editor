import { basename } from "path";
import { promises as fs } from "fs";
import type { FileHandler, FileResult } from "./types";

export const markdownHandler: FileHandler = {
  extensions: ["md"],

  async read(filePath: string): Promise<FileResult> {
    const content = await fs.readFile(filePath, "utf-8");
    return {
      path: filePath,
      name: basename(filePath),
      content,
      previewKind: "markdown",
    };
  },
};
