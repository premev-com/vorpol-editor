import { basename } from "path";
import * as fs from "fs";
import type { FileHandler, FileResult } from "./types";

export const textHandler: FileHandler = {
  extensions: ["txt"],

  async read(filePath: string): Promise<FileResult> {
    const content = fs.readFileSync(filePath, "utf-8");
    return {
      path: filePath,
      name: basename(filePath),
      content,
    };
  },
};
