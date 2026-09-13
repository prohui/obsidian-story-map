/** Obsidian's supported runtimes have ResizeObserver; avoid an eval-based legacy polyfill. */
export default class NativeResizeObserver {
  private observer?: ResizeObserver;
  constructor(private callback: ResizeObserverCallback) {}
  observe(target: Element, options?: ResizeObserverOptions): void {
    this.observer ||= new ResizeObserver(this.callback);
    this.observer.observe(target, options);
  }
  unobserve(target: Element): void { this.observer?.unobserve(target); }
  disconnect(): void { this.observer?.disconnect(); }
}
