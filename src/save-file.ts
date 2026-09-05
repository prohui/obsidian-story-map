import type { ExportFormat } from "./export";

export interface SaveHandle {
  name: string;
  createWritable(): Promise<{ write(data: ArrayBuffer): Promise<void>; close(): Promise<void>; abort(): Promise<void> }>;
}
export interface SavePickerWindow {
  showSaveFilePicker?: (options: { id: string; suggestedName: string; excludeAcceptAllOption: boolean; types: Array<{ description: string; accept: Record<string, string[]> }> }) => Promise<SaveHandle>;
}
export function exportFilename(name: string, format: ExportFormat): string {
  const clean = Array.from(name, char => char.charCodeAt(0) < 32 ? "-" : char).join("");
  const base = clean.replace(/[\\/:*?"<>|]/g, "-").replace(/\.(png|pdf|xmind|json)$/i, "").replace(/[. ]+$/g, "").trim();
  return `${base || "Story Map"}.${format}`;
}
export function pickerWindow(doc: Document): SavePickerWindow | null {
  return doc.defaultView as (Window & SavePickerWindow) | null;
}
export async function pickExportFile(win: SavePickerWindow, name: string, format: ExportFormat): Promise<SaveHandle | null> {
  if (!win.showSaveFilePicker) throw new Error("Save dialog unavailable");
  const mime = { png: "image/png", pdf: "application/pdf", json: "application/json", xmind: "application/octet-stream" };
  try {
    return await win.showSaveFilePicker({ id: "story-map-export", suggestedName: exportFilename(name, format), excludeAcceptAllOption: true, types: [{ description: format.toUpperCase(), accept: { [mime[format]]: [`.${format}`] } }] });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "name" in error && error.name === "AbortError") return null;
    throw error;
  }
}
export async function writeExportFile(handle: SaveHandle, output: ArrayBuffer): Promise<string> {
  const stream = await handle.createWritable();
  try { await stream.write(output); await stream.close(); }
  catch (error: unknown) { await stream.abort().catch(() => undefined); throw error; }
  return handle.name;
}
