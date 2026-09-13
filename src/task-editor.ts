import { Modal, type App } from 'obsidian';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DetailEditorApp, type DetailDraft } from './detail-editor-app';
import type { Activity, StoryMapData, Task } from './types';
export { taskT } from './editor-labels';

interface DetailEditorHost {
  app: App; mapPath: string; activeEditors: number; data?: StoryMapData;
  commitModal(action: () => void): Promise<boolean>;
}
class DetailEditorModal extends Modal {
  private busy = false;
  private root?: Root;
  private opened = false;
  constructor(private host: DetailEditorHost, private entity: Task | Activity, private kind: 'task' | 'activity', private create?: (entity: Task | Activity) => void) { super(host.app); }
  onOpen(): void {
    this.opened = true; this.host.activeEditors++;
    this.containerEl.addClass('sm-detail-container');
    this.modalEl.addClass('sm-detail-modal'); this.contentEl.addClass('sm-detail-content');
    const activityId = 'activityId' in this.entity ? this.entity.activityId : undefined;
    const context = this.kind === 'task' ? this.host.data?.activities.find(item => item.id === activityId)?.title : this.host.data?.title;
    this.root = createRoot(this.contentEl);
    this.root.render(createElement(DetailEditorApp, {
      app: this.app, sourcePath: this.host.mapPath, entity: this.entity, kind: this.kind, creating: !!this.create, context,
      onBusy: busy => { this.busy = busy; }, onClose: () => this.close(),
      onSave: (draft: DetailDraft) => this.host.commitModal(() => {
        this.entity.title = draft.title; this.entity.description = draft.description;
        this.entity.attachments = draft.attachments.map(item => ({ ...item }));
        if (this.kind === 'task') { if (draft.color) (this.entity as Task).color = draft.color; else delete (this.entity as Task).color; }
        this.create?.(this.entity);
      }),
    }));
  }
  close(): void { if (!this.busy) super.close(); }
  onClose(): void {
    if (!this.opened) return;
    this.opened = false; this.host.activeEditors--;
    this.root?.unmount(); this.root = undefined; this.contentEl.empty();
  }
}
export class TaskEditorModal extends DetailEditorModal {
  constructor(host: DetailEditorHost, task: Task, create?: (task: Task) => void) { super(host, task, 'task', create ? entity => create(entity as Task) : undefined); }
}
export class ActivityEditorModal extends DetailEditorModal {
  constructor(host: DetailEditorHost, activity: Activity, create?: (activity: Activity) => void) { super(host, activity, 'activity', create); }
}
