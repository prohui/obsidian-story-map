import { t } from "./i18n";
import type { Activity, Task, StoryMapData } from "./types";

export type ExportFormat = "xmind" | "png" | "pdf" | "json";
const colors = { lavender: "#eee5ff", yellow: "#fff0bd", blue: "#dfebff", green: "#e5f2d7" };
const status = { idea: "想法", planned: "已规划", doing: "进行中", done: "已完成" };

export function wrapText(context: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const char of Array.from(paragraph)) {
      if (line && context.measureText(line + char).width > width) { lines.push(line); line = ""; }
      line += char;
    }
    lines.push(line);
  }
  return lines;
}

/** A standalone, full-map rendering: no view filters, zoom, controls or inspector. */
export async function renderMap(data: StoryMapData, doc: Document): Promise<HTMLCanvasElement> {
  await doc.fonts.ready;
  const canvas = doc.body.createEl("canvas");
  canvas.remove();
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(t("无法创建导出画布"));
  ctx.font = "16px sans-serif";
  const colWidth = 240, gutter = 180, margin = 24;
  const columns = data.activities.flatMap<{ activity: Activity; task: Task | undefined }>(activity => {
    const tasks = data.tasks.filter(task => task.activityId === activity.id);
    return tasks.length ? tasks.map(task => ({ activity, task })) : [{ activity, task: undefined }];
  });
  const width = margin * 2 + gutter + Math.max(1, columns.length) * colWidth;
  const heightFor = (text: string, w: number) => wrapText(ctx, text, w).length * 22;
  const activityHeight = Math.max(70, ...data.activities.map(a => heightFor(a.title, Math.max(1, columns.filter(c => c.activity.id === a.id).length) * colWidth - 24) + 32));
  const taskHeight = Math.max(70, ...columns.map(c => heightFor(c.task?.title || "", colWidth - 24) + 32));
  const storyText = (story: StoryMapData["stories"][number]) => {
    const role = data.roles.find(role => role.id === story.roleId);
    return `${story.title}\n${t(status[story.status])} · ${t("{0} 点", story.estimate)}${role ? `\n${role.name}` : ""}`;
  };
  const storiesAt = (taskId: string | undefined, releaseId: string) => data.stories.filter(s => s.taskId === taskId && s.releaseId === releaseId);
  const storyHeight = (text: string) => Math.max(104, heightFor(text, colWidth - 40) + 30);
  const rows = data.releases.map(release => ({ release, height: Math.max(140, heightFor(`${release.title}\n${release.subtitle}`, gutter - 24) + 32, ...columns.map(c => storiesAt(c.task?.id, release.id).reduce((h, s) => h + storyHeight(storyText(s)) + 12, 24))) }));
  const titleHeight = heightFor(data.title, width - margin * 2) + 32;
  const height = margin * 2 + titleHeight + activityHeight + taskHeight + rows.reduce((h, row) => h + row.height, 0);
  // Avoid browser-dependent canvas truncation and excessive memory consumption.
  if (width > 16000 || height > 16000 || width * height > 32000000) throw new Error(t("地图过大，请选择 XMind 或 JSON 导出"));
  canvas.width = width; canvas.height = height;
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height);
  const text = (value: string, x: number, y: number, w: number) => {
    ctx.font = "16px sans-serif"; ctx.fillStyle = "#202124"; ctx.textBaseline = "top";
    wrapText(ctx, value, w).forEach((line, index) => ctx.fillText(line, x, y + index * 22));
  };
  const box = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color; ctx.fillRect(x, y, w, h); ctx.strokeStyle = "#d8dbe2"; ctx.strokeRect(x, y, w, h);
  };
  text(data.title, margin, margin, width - 2 * margin);
  let y = margin + titleHeight;
  text(t("活动 Activity"), margin + 8, y + 12, gutter - 20);
  let offset = 0;
  data.activities.forEach(activity => {
    const count = columns.filter(c => c.activity.id === activity.id).length;
    const x = margin + gutter + offset * colWidth;
    box(x + 4, y, count * colWidth - 8, activityHeight - 8, "#eee5ff");
    text(activity.title, x + 12, y + 12, count * colWidth - 24); offset += count;
  });
  y += activityHeight;
  text(t("任务 Task"), margin + 8, y + 12, gutter - 20);
  columns.forEach((c, index) => {
    const x = margin + gutter + index * colWidth;
    box(x + 4, y, colWidth - 8, taskHeight - 8, "#f3f4f6");
    text(c.task?.title || "", x + 12, y + 12, colWidth - 24);
  });
  y += taskHeight;
  rows.forEach(({ release, height: rowHeight }) => {
    box(margin, y, gutter - 4, rowHeight, "#f3f4f6");
    text(`${release.title}\n${release.subtitle}`, margin + 12, y + 12, gutter - 24);
    columns.forEach((c, index) => {
      const x = margin + gutter + index * colWidth;
      box(x, y, colWidth, rowHeight, "#ffffff");
      let storyY = y + 12;
      storiesAt(c.task?.id, release.id).forEach(story => {
        const value = storyText(story), h = storyHeight(value);
        box(x + 8, storyY, colWidth - 16, h, colors[story.color] || colors.lavender);
        text(value, x + 20, storyY + 12, colWidth - 40); storyY += h + 12;
      });
    });
    y += rowHeight;
  });
  return canvas;
}

export async function canvasBytes(canvas: HTMLCanvasElement, type: "image/png" | "image/jpeg"): Promise<ArrayBuffer> {
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error(t("图像生成失败"))), type, 0.95));
  return blob.arrayBuffer();
}

/** Embed the map as one raster page; this preserves all supported scripts without font downloads. */
export function imagePdf(jpeg: Uint8Array, width: number, height: number): ArrayBuffer {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  let length = 0;
  const add = (value: string | Uint8Array) => { const bytes = typeof value === "string" ? encoder.encode(value) : value; parts.push(bytes); length += bytes.length; };
  const offsets = [0];
  const scale = Math.min(0.75, 14400 / width, 14400 / height);
  const w = (width * scale).toFixed(2), h = (height * scale).toFixed(2);
  add("%PDF-1.4\n");
  const object = (id: number, body: string) => { offsets[id] = length; add(`${id} 0 obj\n${body}\nendobj\n`); };
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Map 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = length;
  add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  add(jpeg); add("\nendstream\nendobj\n");
  const commands = `q\n${w} 0 0 ${h} 0 0 cm\n/Map Do\nQ\n`;
  object(5, `<< /Length ${encoder.encode(commands).length} >>\nstream\n${commands}endstream`);
  const xref = length;
  add("xref\n0 6\n0000000000 65535 f \n");
  for (let i = 1; i <= 5; i++) add(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const result = new Uint8Array(length); let position = 0;
  parts.forEach(part => { result.set(part, position); position += part.length; });
  return result.buffer;
}
