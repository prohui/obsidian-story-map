import type { TaskColor, PresetColor } from "./types";

export const taskColors: Record<PresetColor, { label: string; background: string }> = {
  lavender: { label: "紫色", background: "#eee9ff" },
  blue: { label: "蓝色", background: "#e4efff" },
  green: { label: "绿色", background: "#e4f3d5" },
  yellow: { label: "黄色", background: "#fff0be" },
  orange: { label: "橙色", background: "#ffe7cd" },
  pink: { label: "粉色", background: "#fce3ef" },
  red: { label: "红色", background: "#ffdada" },
  gray: { label: "灰色", background: "#e4e6eb" },
};
export function isTaskColor(value: unknown): value is TaskColor {
  return typeof value === "string" && (Object.keys(taskColors).includes(value) || !!normalizeHex(value));
}

export function normalizeHex(value: string): `#${string}` | undefined {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase() as `#${string}`;
  if (/^#[0-9a-f]{3}$/i.test(value)) return ('#' + value.slice(1).split('').map(c => c + c).join('')).toLowerCase() as `#${string}`;
  return undefined;
}
export function colorBackground(value: unknown, fallback = '#eee9ff'): string {
  if (typeof value !== 'string') return fallback;
  return normalizeHex(value) || taskColors[value as PresetColor]?.background || fallback;
}
export function colorInk(value: string): string {
  const hex = colorBackground(value).slice(1);
  const channels = [0, 2, 4].map(i => { const s = parseInt(hex.slice(i, i + 2), 16) / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722 > 0.179 ? '#20242b' : '#ffffff';
}
