export class TFile {
  name: string; extension: string;
  constructor(public path: string) { this.name = path.split('/').pop() || path; this.extension = path.split('.').pop() || ''; }
}
export class FuzzySuggestModal<T> {
  static current: FuzzySuggestModal<unknown> | undefined;
  constructor(public app: unknown) {}
  open() { FuzzySuggestModal.current = this; }
}
export function createFixtureApp() {
  const files = new Map<string, TFile>();
  const listeners = new Set<(file: TFile, oldPath: string) => void>();
  const writes: string[] = [];
  return { files, writes, listeners, app: {
    vault: {
      getFiles: () => [...files.values()], getAbstractFileByPath: (path: string) => files.get(path),
      getResourcePath: (file: TFile) => '/reference.svg?file=' + encodeURIComponent(file.path),
      on: (_event: string, callback: (file: TFile, oldPath: string) => void) => { listeners.add(callback); return callback; },
      offref: (callback: (file: TFile, oldPath: string) => void) => listeners.delete(callback),
      createBinary: async (path: string) => { if (files.has(path)) throw new Error('File exists'); const file = new TFile(path); files.set(path, file); writes.push(path); return file; },
    },
    metadataCache: { getFirstLinkpathDest: (path: string) => files.get(path) },
    fileManager: { getAvailablePathForAttachment: async (name: string) => { let path = 'Assets/' + name; let n = 1; while (files.has(path)) path = 'Assets/' + n++ + '-' + name; return path; } },
    workspace: { getLeaf: () => ({ openFile: async () => {} }) },
  } };
}
