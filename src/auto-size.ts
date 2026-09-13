/** Keep descriptions readable without a second, nested scrollbar. */
export function autoSizeDescription(textarea: HTMLTextAreaElement): () => void {
  const win = textarea.ownerDocument.defaultView;
  if (!win) return () => {};
  textarea.addClass("story-map-auto-description");
  let width = -1;
  const resize = (): void => {
    if (!textarea.isConnected || textarea.clientWidth === 0) return;
    const style = win.getComputedStyle(textarea);
    const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    textarea.setCssProps({ "--story-description-height": "auto" });
    textarea.setCssProps({ "--story-description-height": `${Math.ceil(textarea.scrollHeight + border)}px` });
  };
  // Width changes also change wrapping (including Obsidian pop-out windows).
  const observer = new ResizeObserver(() => {
    if (textarea.clientWidth === width) return;
    width = textarea.clientWidth;
    resize();
  });
  observer.observe(textarea);
  textarea.addEventListener("input", resize);
  const frame = win.requestAnimationFrame(resize);
  return () => {
    win.cancelAnimationFrame(frame);
    observer.disconnect();
    textarea.removeEventListener("input", resize);
  };
}
