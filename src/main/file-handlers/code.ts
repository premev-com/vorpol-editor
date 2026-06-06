import { basename } from "path";
import { promises as fs } from "fs";
import type { FileHandler, FileResult } from "./types";

import { CODE_EXTENSIONS } from "../../shared/extensions";

export const codeExtensions: readonly string[] = CODE_EXTENSIONS;

export const codeHandler: FileHandler = {
  extensions: codeExtensions,

  async read(filePath: string): Promise<FileResult> {
    const content = await fs.readFile(filePath, "utf-8");
    return {
      path: filePath,
      name: basename(filePath),
      content,
    };
  },
};
