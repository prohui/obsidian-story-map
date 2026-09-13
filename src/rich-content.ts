export const vaultLinkPrefix = 'storymap-vault:';
export function vaultLink(path: string): string { return vaultLinkPrefix + encodeURIComponent(path); }
export function vaultPath(link: string): string | undefined {
  if (!link.startsWith(vaultLinkPrefix)) return undefined;
  try { return decodeURIComponent(link.slice(vaultLinkPrefix.length)); } catch { return undefined; }
}
function outsideCode(markdown: string, replace: (text: string) => string): string {
  return markdown.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g).map((part, index) => index % 2 ? part : replace(part)).join('');
}
export function toEditorMarkdown(markdown: string): string {
  return outsideCode(markdown, text => text.replace(/(!?)\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_, image: string, path: string, alias: string | undefined) => `${image}[${(alias || path.split('/').pop() || path).replace(/[[\]]/g, '')}](${vaultLink(path)})`));
}
export function fromEditorMarkdown(markdown: string): string {
  return outsideCode(markdown, text => text.replace(/(!?)\[([^\]]*)\]\(<?(storymap-vault:[^\s)>]+)>?\)/g, (whole: string, image: string, label: string, url: string) => {
    const path = vaultPath(url);
    if (!path) return whole;
    const alias = label && label !== path.split('/').pop() && label !== path ? `|${label}` : '';
    return `${image}[[${path}${alias}]]`;
  }));
}
export function allowedLink(value: string): string | undefined {
  const url = value.trim();
  if (/^(https?:\/\/|mailto:|obsidian:\/\/)/i.test(url)) return url;
  if (vaultPath(url) !== undefined) return url;
  if (/^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(url)) return `https://${url}`;
  return undefined;
}
