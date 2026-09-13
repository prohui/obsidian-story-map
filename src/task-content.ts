import type { Task, Activity } from "./types";

export function taskImage(path: string): boolean { return /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(path); }

/** Update our full-path wiki links as well as attachment references. */
export function renameTaskFiles(task: Task | Activity, oldPath: string, newPath: string): boolean {
  let changed = false;
  const replace = (path: string): string => path === oldPath || path.startsWith(oldPath + "/") ? newPath + path.slice(oldPath.length) : path;
  for (const attachment of task.attachments || []) {
    const path = replace(attachment.path);
    if (path !== attachment.path) { attachment.path = path; changed = true; }
  }
  if (task.description) {
    const description = task.description.replace(/\[\[([^\]|#]+)([^\]]*)\]\]/g, (_, path: string, suffix: string) => `[[${replace(path)}${suffix}]]`);
    if (description !== task.description) { task.description = description; changed = true; }
  }
  return changed;
}
