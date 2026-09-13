import { FuzzySuggestModal, Menu, Notice, TFile, setIcon, type App } from 'obsidian';
import type { Story, TaskAttachment } from './types';
import { taskImage } from './task-content';
import { taskT } from './editor-labels';

class StoryFilePicker extends FuzzySuggestModal<TFile> {
  constructor(app: App, private choose: (file: TFile) => void) { super(app); }
  getItems(): TFile[] { return this.app.vault.getFiles(); }
  getItemText(file: TFile): string { return file.path; }
  onChooseItem(file: TFile): void { this.choose(file); }
}
interface Host {
  app: App;
  mapPath: string;
  activeEditors: number;
  commitModal(action: () => void): Promise<boolean>;
}
/** Attachment edits are saved with the story; removing a link never deletes the file. */
export function renderStoryAttachments(parent: HTMLElement, host: Host, story: Story): void {
  const strip = parent.createDiv('sm-story-attachments');
  strip.setAttribute('aria-label', taskT('图片和文件'));
  let busy = false;
  const fail = (cause: unknown) => new Notice(`${taskT('操作失败，请重试')}: ${cause instanceof Error ? cause.message : String(cause)}`);
  const save = async (attachments: TaskAttachment[]) => {
    if (!await host.commitModal(() => { story.attachments = attachments; })) new Notice(taskT('保存失败，请重试'));
  };
  const attach = async (files: TFile[]) => {
    const items = (story.attachments || []).map(item => ({ ...item }));
    for (const file of files) if (!items.some(item => item.path === file.path)) items.push({ path: file.path, kind: 'reference' });
    await save(items);
  };
  for (const attachment of story.attachments || []) {
    const file = host.app.vault.getAbstractFileByPath(attachment.path);
    const exists = file instanceof TFile;
    const name = attachment.path.split('/').pop() || attachment.path;
    const item = strip.createDiv(`sm-story-attachment${exists && taskImage(file.path) ? ' is-image' : ''}`);
    const open = item.createEl('button', { cls: 'sm-story-attachment-open', attr: { 'aria-label': `${taskT('打开文件')}: ${name}`, title: exists ? attachment.path : taskT('文件不存在') } });
    open.disabled = !exists;
    if (exists && taskImage(file.path)) open.createEl('img', { attr: { src: host.app.vault.getResourcePath(file), alt: name } });
    else { setIcon(open.createSpan(), 'file'); open.createSpan({ text: name }); }
    open.onclick = () => { if (exists) void host.app.workspace.getLeaf('tab').openFile(file).catch(fail); };
    const remove = item.createEl('button', { cls: 'sm-story-attachment-remove', attr: { 'aria-label': `${taskT('移除附件关联')}: ${name}`, title: taskT('移除附件关联') } });
    setIcon(remove, 'x');
    remove.onclick = () => { if (!busy) { busy = true; void save((story.attachments || []).filter(item => item.path !== attachment.path)).catch(fail).finally(() => { busy = false; }); } };
  }
  const input = strip.createEl('input', { type: 'file', cls: 'story-map-hidden' });
  input.multiple = true;
  input.onchange = () => {
    const files = Array.from(input.files || []); input.value = '';
    if (busy || !files.length) return;
    busy = true; host.activeEditors++; add.disabled = true;
    void (async () => {
      const imported: TFile[] = [];
      try {
        for (const file of files) {
          const path = await host.app.fileManager.getAvailablePathForAttachment(file.name, host.mapPath);
          imported.push(await host.app.vault.createBinary(path, await file.arrayBuffer()));
        }
      } catch (cause) { fail(cause); }
      finally {
        try { if (imported.length) await attach(imported); }
        catch (cause) { fail(cause); }
        finally { busy = false; host.activeEditors--; add.disabled = false; }
      }
    })();
  };
  const add = strip.createEl('button', { cls: 'sm-story-attachment-add', attr: { 'aria-label': taskT('添加附件'), title: taskT('添加附件') } });
  setIcon(add, 'plus');
  add.onclick = event => {
    if (busy) return;
    new Menu().addItem(item => item.setTitle(taskT('从电脑添加')).setIcon('upload').onClick(() => input.click()))
      .addItem(item => item.setTitle(taskT('选择库内文件')).setIcon('folder').onClick(() => new StoryFilePicker(host.app, file => {
        if (busy) return;
        busy = true;
        void attach([file]).catch(fail).finally(() => { busy = false; });
      }).open())).showAtMouseEvent(event);
  };
}
