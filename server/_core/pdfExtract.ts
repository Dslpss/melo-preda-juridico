import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export async function extrairTextoPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = (await import("pdf-parse")) as any;
  const tmpPath = join(tmpdir(), `pdf-extract-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  try {
    writeFileSync(tmpPath, buffer);
    const fileUrl = "file:///" + tmpPath.replace(/\\/g, "/");
    const parser = new PDFParse({ url: fileUrl });
    const result = await parser.getText();
    await parser.destroy?.();
    return (result.text as string) ?? "";
  } finally {
    try { unlinkSync(tmpPath); } catch {}
  }
}
