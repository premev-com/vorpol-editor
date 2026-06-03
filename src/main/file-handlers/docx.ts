import { basename } from "path";
import * as fs from "fs";
import type { FileHandler, FileResult } from "./types";

let _mammoth: typeof import("mammoth") | null = null;
function getMammoth(): typeof import("mammoth") {
  if (!_mammoth) {
    _mammoth = require("mammoth") as typeof import("mammoth");
  }
  return _mammoth;
}

export const docxHandler: FileHandler = {
  extensions: ["docx"],

  async read(filePath: string): Promise<FileResult> {
    const m = getMammoth();
    const buffer = fs.readFileSync(filePath);
    const [textResult, htmlResult] = await Promise.all([
      m.extractRawText({ buffer }),
      m.convertToHtml(
        { buffer },
        {
          convertImage: m.images.imgElement(async (image) => {
            const imageBuffer = await image.read();
            const base64 = imageBuffer.toString("base64");
            const contentType = image.contentType ?? "image/png";
            return { src: `data:${contentType};base64,${base64}` };
          }),
        },
      ),
    ]);

    // Wrap mammoth output in a docx-specific container for styling
    const previewHtml = `<div class="docx-preview">${htmlResult.value}</div>`;

    return {
      path: filePath,
      name: basename(filePath),
      content: textResult.value,
      previewHtml,
      previewKind: "docx",
    };
  },
};
