import type { TaskColor } from "./types";

export const taskColors: Record<TaskColor, { label: string; background: string }> = {
  lavender: { label: "紫色", background: "#eee9ff" },
  blue: { label: "蓝色", background: "#e4efff" },
  green: { label: "绿色", background: "#e4f3d5" },
  yellow: { label: "黄色", background: "#fff0be" },
  orange: { label: "橙色", background: "#ffe7cd" },
  pink: { label: "粉色", background: "#fce3ef" },
};
export function isTaskColor(value: unknown): value is TaskColor {
  return typeof value === "string" && Object.keys(taskColors).includes(value);
}
