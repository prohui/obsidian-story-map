import { FileView, FuzzySuggestModal, Menu, Modal, Notice, Plugin, TFile, TFolder, WorkspaceLeaf, normalizePath, setIcon, getLanguage } from "obsidian";
import { t, setLocale, isLanguage, languageNames, type Language } from "./i18n";
import { strToU8, zipSync } from "fflate";
import { createSampleMap } from "./sample";
import { renderMap, canvasBytes, imagePdf, type ExportFormat } from "./export";
import { pickerWindow, pickExportFile, writeExportFile, exportFilename } from "./save-file";
import type { Activity, Release, Story, StoryMapData, Task } from "./types";

const VIEW_TYPE = "story-map-view";
const DATA_PATH = ".story-map.json";
const PLUGIN_VERSION = "1.4.1";
const STATUS_LABELS: Record<Story["status"], string> = { idea: "想法", planned: "已规划", doing: "进行中", done: "已完成" };
const PRIORITY_LABELS: Record<Story["priority"], string> = { low: "低", medium: "中", high: "高" };

function cloneDefault(): StoryMapData { return createSampleMap(); }
function uid(prefix: string): string { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`; }

class ExportModal extends Modal {
  constructor(private plugin: StoryMapPlugin) { super(plugin.app); }
  onOpen(): void {
    const content = this.contentEl;
    content.addClass("story-map-modal", "story-map-export-modal");
    content.createEl("h2", { text: t("导出地图") });
    const grid = content.createDiv({ cls: "story-map-export-grid", attr: { role: "group", "aria-label": t("导出格式") } });
    let selected = this.plugin.exportFormat;
    const formats: ExportFormat[] = ["png", "pdf", "xmind", "json"];
    const descriptions: Record<ExportFormat, string> = { png: "PNG：完整地图图片，适合分享和插入文档。", pdf: "PDF：单页地图图片，适合分享和打印，文字不可搜索。", xmind: "XMind：可继续编辑的脑图，包含用户旅程、里程碑和角色。", json: "JSON：完整地图数据备份；暂不提供导入界面。" };
    const cards: HTMLButtonElement[] = [];
    const icons: Record<ExportFormat, string> = { png: "image", pdf: "file-text", xmind: "network", json: "braces" };
    formats.forEach(format => {
      const card = grid.createEl("button", { cls: "story-map-export-card", attr: { "data-format": format, "aria-pressed": String(selected === format) } });
      cards.push(card);
      setIcon(card.createSpan("story-map-export-icon"), icons[format]);
      card.createSpan({ cls: "story-map-export-title", text: format === "xmind" ? "XMind" : format.toUpperCase() });
      card.createSpan({ cls: "story-map-export-description", text: t(descriptions[format]).replace(/^[^：:]+[：:]\s*/, "") });
      card.onclick = () => { selected = format; cards.forEach(item => item.setAttribute("aria-pressed", String(item === card))); };
    });
    const win = pickerWindow(content.ownerDocument);
    if (!win?.showSaveFilePicker) content.createEl("p", { cls: "story-map-modal-help", text: t("保存到库内文件夹：{0}，同名文件自动编号。", t("故事地图导出")) });
    content.createEl("p", { text: t("导出完整地图，不受搜索、筛选或缩放影响。"), cls: "story-map-modal-help" });
    const error = content.createEl("p", { attr: { role: "alert" } });
    const actions = content.createDiv("story-map-modal-actions");
    const cancel = actions.createEl("button", { text: t("取消") });
    cancel.onclick = () => this.close();
    const button = actions.createEl("button", { text: t("导出"), cls: "mod-cta" });
    button.onclick = () => {
      button.disabled = true; cancel.disabled = true; cards.forEach(card => card.disabled = true); button.setText(t("正在导出…")); error.empty();
      const run = async (): Promise<boolean> => {
        const format = selected;
        const name = exportFilename(this.plugin.data.title, format);
        if (win?.showSaveFilePicker) {
          const handle = await pickExportFile(win, name, format);
          if (!handle) return false;
          await this.plugin.exportMap(format, content.ownerDocument, bytes => writeExportFile(handle, bytes));
        } else await this.plugin.exportMap(format, content.ownerDocument, bytes => this.plugin.saveExport(name.replace(/\.[^.]+$/, ""), format, bytes));
        this.plugin.exportFormat = format;
        await this.plugin.savePreferences();
        return true;
      };
      void run().then(saved => { if (saved) this.close(); }).catch((cause: unknown) => {
        error.setText(t("导出失败：{0}", cause instanceof Error ? cause.message : String(cause)));
      }).finally(() => { button.disabled = false; cancel.disabled = false; cards.forEach(card => card.disabled = false); button.setText(t("导出")); });
    };
  }
  onClose(): void { this.contentEl.empty(); }
}

class MapsModal extends Modal {
  constructor(private plugin: StoryMapPlugin) { super(plugin.app); }
  onOpen(): void { void this.renderList(); }
  private async renderList(): Promise<void> {
    const content = this.contentEl; content.empty(); content.addClass("story-map-modal");
    content.createEl("h2", { text: t("地图管理") });
    const error = content.createEl("p", { attr: { role: "alert" } });
    const run = (action: () => Promise<void>) => { void action().catch((cause: unknown) => error.setText(String(cause))); };
    const name = content.createEl("input", { placeholder: t("地图名称"), attr: { "aria-label": t("地图名称") } });
    const actions = content.createDiv("story-map-modal-actions");
    for (const [label, mode] of [["新建空白地图", "blank"], ["从示例新建", "sample"], ["复制当前地图", "copy"]] as const) {
      actions.createEl("button", { text: t(label) }).onclick = () => run(async () => { await this.plugin.createMap(name.value, mode); this.close(); });
    }
    try {
      for (const entry of await this.plugin.listMaps()) {
        const row = content.createDiv("story-map-modal-actions");
        row.createSpan({ text: `${entry.data.title}${entry.data.archived ? ` (${t("已归档")})` : ""}` });
        const open = row.createEl("button", { text: t("打开") });
        open.disabled = entry.path === this.plugin.mapPath;
        open.onclick = () => run(async () => { await this.plugin.switchMap(entry.path); this.close(); });
        const archive = row.createEl("button", { text: t(entry.data.archived ? "恢复地图" : "归档地图") });
        archive.disabled = entry.path === this.plugin.mapPath;
        archive.onclick = () => run(async () => { await this.plugin.archiveMap(entry.path, !entry.data.archived); await this.renderList(); });
      }
    } catch (cause) { error.setText(String(cause)); }
  }
  onClose(): void { this.contentEl.empty(); }
}

class CreateMapFileModal extends Modal {
  constructor(private plugin: StoryMapPlugin, private folder: TFolder) { super(plugin.app); }
  onOpen(): void {
    const content = this.contentEl; content.addClass("story-map-modal");
    content.createEl("h2", { text: t("新建故事地图") });
    const input = content.createEl("input", { placeholder: t("地图名称"), attr: { "aria-label": t("地图名称") } });
    const template = content.createEl("select", { attr: { "aria-label": t("模板") } });
    template.createEl("option", { value: "starter", text: t("轻量模板") });
    template.createEl("option", { value: "sample", text: t("从示例新建") });
    const error = content.createEl("p", { attr: { role: "alert" } });
    const actions = content.createDiv("story-map-modal-actions");
    actions.createEl("button", { text: t("取消") }).onclick = () => this.close();
    const create = actions.createEl("button", { text: t("创建"), cls: "mod-cta" });
    create.onclick = () => {
      if (!input.value.trim()) return;
      create.disabled = true;
      void this.plugin.createMapFile(this.folder, input.value, template.value === "sample").then(() => this.close()).catch((cause: unknown) => { error.setText(String(cause)); create.disabled = false; });
    };
    input.focus();
  }
}

class RoleManagerModal extends Modal {
  constructor(private plugin: StoryMapPlugin) { super(plugin.app); }
  onOpen(): void { this.renderRoles(); }
  private renderRoles(): void {
    const { contentEl } = this; contentEl.empty(); contentEl.addClass("story-map-modal", "story-map-role-modal");
    contentEl.createEl("h2", { text: t("角色管理") });
    contentEl.createEl("p", { text: t("角色属于整张地图，可分配给任意用户故事。"), cls: "story-map-modal-help" });
    const list = contentEl.createDiv("story-map-role-list");
    this.plugin.data.roles.forEach(role => {
      const row = list.createDiv("story-map-role-row");
      const name = row.createEl("input", { value: role.name, attr: { "aria-label": t("角色名称") } });
      const description = row.createEl("input", { value: role.description, placeholder: t("角色说明"), attr: { "aria-label": t("角色说明") } });
      const remove = row.createEl("button", { text: t("删除"), attr: { "aria-label": t("删除角色 {0}", role.name) } });
      name.onchange = () => { role.name = name.value.trim() || t("未命名角色"); void this.plugin.commit(); };
      description.onchange = () => { role.description = description.value.trim(); void this.plugin.commit(); };
      remove.onclick = () => {
        this.plugin.data.roles.remove(role);
        this.plugin.data.stories.forEach(story => { if (story.roleId === role.id) story.roleId = undefined; });
        void this.plugin.commit(); this.renderRoles();
      };
    });
    if (!this.plugin.data.roles.length) list.createDiv({ text: t("还没有角色"), cls: "story-map-empty" });
    const actions = contentEl.createDiv("story-map-modal-actions");
    const add = actions.createEl("button", { text: t("+ 角色") }); add.onclick = () => { this.plugin.data.roles.push({ id: uid("role"), name: t("新角色"), description: "" }); void this.plugin.commit(); this.renderRoles(); };
    const done = actions.createEl("button", { text: t("完成"), cls: "mod-cta" }); done.onclick = () => this.close();
  }
  onClose(): void { this.contentEl.empty(); }
}

class MilestoneManagerModal extends Modal {
  constructor(private plugin: StoryMapPlugin) { super(plugin.app); }
  onOpen(): void { this.renderMilestones(); }
  private renderMilestones(): void {
    const { contentEl } = this; contentEl.empty(); contentEl.addClass("story-map-modal", "story-map-milestone-modal");
    contentEl.createEl("h2", { text: t("里程碑管理") });
    contentEl.createEl("p", { text: t("里程碑决定 Story 所在的横向发布切片。包含 Story 的里程碑不能删除。"), cls: "story-map-modal-help" });
    const list = contentEl.createDiv("story-map-milestone-list");
    this.plugin.data.releases.forEach(release => {
      const storyCount = this.plugin.data.stories.filter(story => story.releaseId === release.id).length;
      const row = list.createDiv("story-map-milestone-row");
      const title = row.createEl("input", { value: release.title, attr: { "aria-label": t("里程碑名称") } });
      const subtitle = row.createEl("input", { value: release.subtitle, placeholder: t("说明"), attr: { "aria-label": t("里程碑说明") } });
      const remove = row.createEl("button", { text: storyCount ? String(storyCount) : t("删除"), attr: { "aria-label": storyCount ? t("该里程碑包含 {0} 个 Story，不能删除", storyCount) : t("删除里程碑 {0}", release.title) } });
      remove.disabled = storyCount > 0; remove.title = storyCount ? t("请先将 Story 移动到其他里程碑") : t("删除里程碑");
      title.onchange = () => { release.title = title.value.trim() || t("未命名里程碑"); void this.plugin.commit(); };
      subtitle.onchange = () => { release.subtitle = subtitle.value.trim(); void this.plugin.commit(); };
      remove.onclick = () => {
        if (this.plugin.data.stories.some(story => story.releaseId === release.id)) { new Notice(t("这个里程碑下面还有 Story，不能删除")); this.renderMilestones(); return; }
        this.plugin.data.releases.remove(release); void this.plugin.commit(); this.renderMilestones();
      };
    });
    if (!this.plugin.data.releases.length) list.createDiv({ text: t("还没有里程碑"), cls: "story-map-empty" });
    const actions = contentEl.createDiv("story-map-modal-actions");
    const add = actions.createEl("button", { text: t("+ 里程碑") });
    add.onclick = () => { this.plugin.data.releases.push({ id: uid("milestone"), title: t("新里程碑"), subtitle: "" }); void this.plugin.commit(); this.renderMilestones(); };
    const done = actions.createEl("button", { text: t("完成"), cls: "mod-cta" }); done.onclick = () => this.close();
  }
  onClose(): void { this.contentEl.empty(); }
}

class NotePicker extends FuzzySuggestModal<TFile> {
  constructor(private plugin: StoryMapPlugin, private choose: (path: string) => void) { super(plugin.app); this.setPlaceholder(t("搜索笔记")); }
  getItems(): TFile[] { return this.plugin.app.vault.getMarkdownFiles(); }
  getItemText(file: TFile): string { return `${file.basename} — ${file.path}`; }
  onChooseItem(file: TFile): void { this.choose(file.path); }
}

function noteSelector(parent: HTMLElement, plugin: StoryMapPlugin, initial: string | undefined, change: (path: string | undefined) => void): void {
  let path = initial;
  const container = parent.createDiv("story-map-note-selector");
  const render = (): void => {
    container.empty();
    const select = container.createEl("button", { text: path?.split("/").pop()?.replace(/\.md$/i, "") || t("搜索笔记"), attr: { title: path || t("搜索笔记") } });
    select.onclick = () => new NotePicker(plugin, selected => { path = selected; change(path); render(); }).open();
    if (path) {
      container.createEl("button", { text: t("打开笔记") }).onclick = () => { if (path) void plugin.app.workspace.openLinkText(path, ""); };
      container.createEl("button", { text: t("解除关联") }).onclick = () => { path = undefined; change(undefined); render(); };
    }
  };
  render();
}

class ConflictModal extends Modal {
  constructor(private plugin: StoryMapPlugin) { super(plugin.app); }
  onOpen(): void {
    this.contentEl.addClass("story-map-modal", "story-map-compact-dialog");
    this.contentEl.createEl("h2", { text: t("文件冲突") });
    this.contentEl.createEl("p", { text: t("保留双方版本：先将当前地图另存为副本，再加载磁盘版本。") });
    const error = this.contentEl.createEl("p", { attr: { role: "alert" } });
    const actions = this.contentEl.createDiv("story-map-modal-actions");
    actions.createEl("button", { text: t("取消") }).onclick = () => this.close();
    const save = actions.createEl("button", { text: t("备份并重新加载"), cls: "mod-cta" });
    save.onclick = () => {
      save.disabled = true;
      void this.plugin.resolveConflict().then(() => this.close()).catch((cause: unknown) => { error.setText(String(cause)); save.disabled = false; });
    };
  }
}

class SavingModal extends Modal {
  private saving = false;
  private editingPlugin: StoryMapPlugin | undefined;
  protected trackEditor(plugin: StoryMapPlugin): void { this.editingPlugin = plugin; plugin.activeEditors++; }
  onClose(): void { if (this.editingPlugin) { this.editingPlugin.activeEditors--; this.editingPlugin = undefined; } }
  protected async persist(plugin: StoryMapPlugin, action: () => void): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    const controls = Array.from(this.contentEl.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>("input,button,select,textarea"));
    const disabled = controls.map(control => control.disabled);
    controls.forEach(control => { control.disabled = true; });
    const message = this.contentEl.querySelector<HTMLElement>(".story-map-submit-status") || this.contentEl.createEl("p", { cls: "story-map-submit-status", attr: { role: "alert" } });
    message.setText(t("正在保存…"));
    try {
      if (await plugin.commitModal(action)) { this.saving = false; this.close(); return; }
      message.setText(t(plugin.conflicted ? "地图已被外部修改，已停止保存；请先备份当前修改" : "保存失败，修改仍在内存中；请重试"));
    } finally {
      this.saving = false;
      controls.forEach((control, index) => { control.disabled = disabled[index] || false; });
    }
  }
  close(): void { if (!this.saving) super.close(); }
}

class MilestoneEditorModal extends SavingModal {
  constructor(private plugin: StoryMapPlugin, private release: Release) { super(plugin.app); }
  onOpen(): void {
    this.trackEditor(this.plugin);
    this.contentEl.addClass("story-map-modal", "story-map-compact-dialog");
    this.contentEl.createEl("h2", { text: t("里程碑管理") });
    const field = (caption: string, value: string): HTMLInputElement => {
      const row = this.contentEl.createDiv("story-map-form-row");
      row.createEl("label", { text: caption });
      return row.createEl("input", { value, attr: { "aria-label": caption } });
    };
    const name = field(t("里程碑名称"), this.release.title);
    const subtitle = field(t("里程碑说明"), this.release.subtitle);
    const actions = this.contentEl.createDiv("story-map-modal-actions");
    const remove = actions.createEl("button", { text: t("删除里程碑"), cls: "story-map-danger-action" });
    remove.disabled = this.plugin.data.stories.some(story => story.releaseId === this.release.id);
    if (remove.disabled) this.contentEl.createEl("p", { text: t("请先将 Story 移动到其他里程碑") });
    remove.onclick = () => {
      if (this.plugin.data.stories.some(story => story.releaseId === this.release.id)) return;
      void this.persist(this.plugin, () => { this.plugin.data.releases = this.plugin.data.releases.filter(item => item.id !== this.release.id); });
    };
    actions.createEl("button", { text: t("取消") }).onclick = () => this.close();
    const save = actions.createEl("button", { text: t("保存"), cls: "mod-cta" });
    name.oninput = () => { save.disabled = !name.value.trim(); };
    const submit = (): void => {
      if (!name.value.trim()) return;
      void this.persist(this.plugin, () => {
        this.release.title = name.value.trim(); this.release.subtitle = subtitle.value.trim();
      });
    };
    save.onclick = submit;
    this.contentEl.onkeydown = event => { if (event.key === "Enter" && !event.isComposing) { event.preventDefault(); submit(); } };
    name.focus(); name.select();
  }
}

class CreateItemModal extends SavingModal {
  constructor(private plugin: StoryMapPlugin, private heading: string, private save: (title: string, description: string) => void, private context = "", private description = false) { super(plugin.app); }
  onOpen(): void {
    this.trackEditor(this.plugin);
    this.contentEl.addClass("story-map-modal", "story-map-compact-dialog"); this.contentEl.createEl("h2", { text: this.heading });
    if (this.context) this.contentEl.createEl("p", { text: this.context, cls: "story-map-modal-help" });
    const nameRow = this.contentEl.createDiv("story-map-form-row");
    const caption = this.description ? t("里程碑名称") : this.heading === t("添加 Activity") ? t("Activity 名称") : t("Task 名称");
    nameRow.createEl("label", { text: caption });
    const name = nameRow.createEl("input", { attr: { "aria-label": caption, "aria-required": "true" } });
    let description: HTMLInputElement | undefined;
    if (this.description) {
      const row = this.contentEl.createDiv("story-map-form-row"); row.createEl("label", { text: t("里程碑说明") });
      description = row.createEl("input", { attr: { "aria-label": t("里程碑说明") } });
    }
    const actions = this.contentEl.createDiv("story-map-modal-actions");
    actions.createEl("button", { text: t("取消") }).onclick = () => this.close();
    const button = actions.createEl("button", { text: t("创建"), cls: "mod-cta" }); button.disabled = true;
    name.oninput = () => { button.disabled = !name.value.trim(); };
    const submit = (): void => { if (!name.value.trim()) return; void this.persist(this.plugin, () => this.save(name.value.trim(), description?.value.trim() || "")); };
    button.onclick = submit;
    this.contentEl.onkeydown = event => { if (event.key === "Enter" && !event.isComposing) { event.preventDefault(); submit(); } };
    name.focus();
  }
}

class StoryEditorModal extends SavingModal {
  constructor(private plugin: StoryMapPlugin, private story: Story, private saveStory?: (story: Story) => void) { super(plugin.app); }
  onOpen(): void {
    this.trackEditor(this.plugin);
    const { contentEl } = this;
    contentEl.addClass("story-map-modal", "story-map-story-dialog");
    contentEl.createEl("h2", { text: this.saveStory ? t("添加故事") : t("编辑故事") });
    contentEl.createEl("p", { cls: "story-map-modal-help", text: [this.plugin.data.activities.find(item => item.id === this.story.activityId)?.title, this.plugin.data.tasks.find(item => item.id === this.story.taskId)?.title, this.plugin.data.releases.find(item => item.id === this.story.releaseId)?.title].filter(Boolean).join(" → ") });
    const fields: Array<[string, keyof Story, "text" | "number" | "textarea"]> = [
      [t("故事标题"), "title", "text"], [t("故事描述"), "description", "textarea"], [t("估点"), "estimate", "number"]
    ];
    const controls: Partial<Record<keyof Story, HTMLInputElement | HTMLTextAreaElement>> = {};
    fields.forEach(([label, key, type]) => {
      const row = contentEl.createDiv("story-map-form-row"); row.createEl("label", { text: label });
      row.addClass(`story-map-edit-${key}`);
      const control = type === "textarea" ? row.createEl("textarea") : row.createEl("input", { type });
      control.value = String(this.story[key] ?? ""); controls[key] = control;
    });
    let notePath = this.story.notePath;
    const noteRow = contentEl.createDiv("story-map-form-row"); noteRow.createEl("label", { text: t("关联笔记") });
    noteSelector(noteRow, this.plugin, notePath, path => { notePath = path; });
    const roleRow = contentEl.createDiv("story-map-form-row"); roleRow.createEl("label", { text: t("角色") });
    const roleSelect = roleRow.createEl("select"); roleSelect.createEl("option", { value: "", text: t("未分配角色") });
    this.plugin.data.roles.forEach(role => roleSelect.createEl("option", { value: role.id, text: role.name })); roleSelect.value = this.story.roleId || "";
    const statusRow = contentEl.createDiv("story-map-form-row"); statusRow.createEl("label", { text: t("状态") });
    const statusSelect = statusRow.createEl("select");
    [["idea", t("想法")], ["planned", t("已规划")], ["doing", t("进行中")], ["done", t("已完成")]].forEach(([value, text]) => statusSelect.createEl("option", { value, text }));
    statusSelect.value = this.story.status;
    const priorityRow = contentEl.createDiv("story-map-form-row"); priorityRow.createEl("label", { text: t("优先级") });
    const prioritySelect = priorityRow.createEl("select");
    [["low", t("低")], ["medium", t("中")], ["high", t("高")]].forEach(([value, text]) => prioritySelect.createEl("option", { value, text }));
    prioritySelect.value = this.story.priority;
    const tagsRow = contentEl.createDiv("story-map-form-row"); tagsRow.createEl("label", { text: t("标签") });
    const tagsInput = tagsRow.createEl("input", { value: this.story.tags.join(", "), placeholder: t("用逗号分隔") });
    const metadata = contentEl.createDiv("story-map-dialog-metadata");
    const estimateRow = controls.estimate?.parentElement;
    metadata.append(roleRow, statusRow, priorityRow);
    if (estimateRow) metadata.append(estimateRow);
    contentEl.append(noteRow, tagsRow);
    const actions = contentEl.createDiv("story-map-modal-actions");
    const cancel = actions.createEl("button", { text: t("取消") }); cancel.onclick = () => this.close();
    const save = actions.createEl("button", { text: t("保存"), cls: "mod-cta" });
    save.disabled = !controls.title?.value.trim();
    if (controls.title) controls.title.oninput = () => { save.disabled = !controls.title?.value.trim(); };
    save.onclick = () => {
      if (!controls.title?.value.trim()) return;
      void this.persist(this.plugin, () => {
      this.story.title = controls.title?.value.trim() || t("未命名故事");
      this.story.description = controls.description?.value.trim() || "";
      this.story.estimate = Math.max(0, Number(controls.estimate?.value) || 0);
      this.story.notePath = notePath;
      this.story.roleId = roleSelect.value || undefined;
      this.story.status = statusSelect.value as Story["status"];
      this.story.priority = prioritySelect.value as Story["priority"];
      this.story.tags = tagsInput.value.split(/[,，]/).map(item => item.trim()).filter(Boolean);
      if (this.saveStory) this.saveStory(this.story);
      });
    };
    window.setTimeout(() => (controls.title as HTMLInputElement | undefined)?.select(), 0);
  }
  onClose(): void { super.onClose(); this.contentEl.empty(); }
}

class StoryMapView extends FileView {
  private selectedId: string | null = null;
  private query = "";
  private roleFilter = "";
  private inspectorOpen = false;
  private selectTimer: number | undefined;
  constructor(leaf: WorkspaceLeaf, private plugin: StoryMapPlugin) { super(leaf); this.allowNoFile = true; }
  owns(plugin: StoryMapPlugin): boolean { return this.plugin === plugin; }
  async onLoadFile(file: TFile): Promise<void> {
    if (!await this.plugin.commit(false)) throw new Error(t(this.plugin.saveStatus));
    this.plugin = await this.plugin.fileSession(file);
    this.resetMapState(); this.render();
  }
  async onUnloadFile(): Promise<void> { await this.plugin.commit(false); }
  async onRename(file: TFile): Promise<void> { this.plugin.mapPath = file.path; this.render(); }
  getViewType(): string { return VIEW_TYPE; }
  getDisplayText(): string { return this.file?.basename || t("故事地图"); }
  getIcon(): string { return "map"; }
  resetMapState(): void { window.clearTimeout(this.selectTimer); this.selectedId = null; this.query = ""; this.roleFilter = ""; this.inspectorOpen = false; }
  async onOpen(): Promise<void> { this.render(); }
  async onClose(): Promise<void> { window.clearTimeout(this.selectTimer); }

  render(): void {
    const root = this.containerEl.children[1] as HTMLElement;
    const previousViewport = root.querySelector<HTMLElement>(".story-map-viewport");
    const scrollLeft = previousViewport?.scrollLeft || 0;
    const scrollTop = previousViewport?.scrollTop || 0;
    root.empty(); root.addClass("story-map-root");
    const data = this.plugin.data;
    const header = root.createDiv("story-map-header");
    const titleWrap = header.createDiv("story-map-title"); setIcon(titleWrap.createSpan(), "map");
    const title = titleWrap.createEl("input", { value: data.title, attr: { "aria-label": t("地图名称") } });
    title.onchange = () => { data.title = title.value; void this.plugin.commit(false); };
    const toolbar = header.createDiv("story-map-toolbar");
    if (!this.file) this.iconButton(toolbar, "folder-open", t("地图管理"), () => new MapsModal(this.plugin).open());
    const language = toolbar.createEl("select", { cls: "story-map-language", attr: { "aria-label": t("语言") } });
    [["auto", t("跟随 Obsidian")], ...Object.entries(languageNames)].forEach(([value, text]) => language.createEl("option", { value, text }));
    language.value = this.plugin.language;
    language.onchange = () => void this.plugin.changeLanguage(language.value as Language);
    const search = toolbar.createEl("input", { type: "search", placeholder: t("搜索 Story"), value: this.query, cls: "story-map-search", attr: { "aria-label": t("搜索故事") } });
    search.oninput = () => {
      this.query = search.value.trim().toLowerCase();
      this.applyCardFilters(root);
    };
    const roleFilter = toolbar.createEl("select", { cls: "story-map-role-filter", attr: { "aria-label": t("按角色筛选") } });
    roleFilter.createEl("option", { value: "", text: t("全部角色") });
    roleFilter.createEl("option", { value: "__none", text: t("未分配角色") });
    this.plugin.data.roles.forEach(role => roleFilter.createEl("option", { value: role.id, text: role.name }));
    if (this.roleFilter && this.roleFilter !== "__none" && !this.plugin.data.roles.some(role => role.id === this.roleFilter)) this.roleFilter = "";
    roleFilter.value = this.roleFilter;
    roleFilter.onchange = () => { this.roleFilter = roleFilter.value; this.applyCardFilters(root); };
    this.iconButton(toolbar, "undo-2", t("撤销"), () => this.plugin.undo());
    this.iconButton(toolbar, "redo-2", t("重做"), () => this.plugin.redo());
    this.iconButton(toolbar, "users", t("角色管理"), () => new RoleManagerModal(this.plugin).open());
    this.iconButton(toolbar, "flag", t("里程碑管理"), () => new MilestoneManagerModal(this.plugin).open());
    this.iconButton(toolbar, "download", t("导出"), () => new ExportModal(this.plugin).open());
    toolbar.createSpan({ text: `${Math.round(data.zoom * 100)}%`, cls: "story-map-zoom-label" });
    this.iconButton(toolbar, "minus", t("缩小"), () => { data.zoom = Math.max(.6, data.zoom - .1); void this.plugin.commit(); });
    this.iconButton(toolbar, "plus", t("放大"), () => { data.zoom = Math.min(1.5, data.zoom + .1); void this.plugin.commit(); });
    this.iconButton(toolbar, "panel-right", t("详情面板"), () => { this.inspectorOpen = !this.inspectorOpen; this.render(); });

    const body = root.createDiv(`story-map-body${this.inspectorOpen ? " has-inspector" : ""}`);
    const viewport = body.createDiv("story-map-viewport");
    const canvas = viewport.createDiv("story-map-canvas"); canvas.style.setProperty("--story-map-zoom", String(data.zoom));
    this.renderCanvas(canvas);
    this.applyCardFilters(root);
    if (this.inspectorOpen) this.renderInspector(body);
    const status = root.createDiv("story-map-status");
    status.createSpan({ text: t("{0} 个故事 · {1} 个活动 · {2} 个角色", data.stories.length, data.activities.length, data.roles.length) });
    status.createSpan({ text: this.plugin.saveStatusText(), cls: "story-map-save-status" });
    status.createEl("button", { text: t("保存"), attr: { "aria-label": t("立即保存或重试保存") } }).onclick = () => void this.plugin.commit(false);
    if (this.plugin.conflicted) status.createEl("button", { text: t("文件冲突") }).onclick = () => new ConflictModal(this.plugin).open();
    viewport.scrollLeft = scrollLeft; viewport.scrollTop = scrollTop;
  }

  private iconButton(parent: HTMLElement, icon: string, label: string, action: () => void): void {
    const btn = parent.createEl("button", { attr: { "aria-label": label } }); setIcon(btn, icon); btn.onclick = action;
  }
  private applyCardFilters(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>(".story-map-card").forEach(card => {
      const matchesQuery = !this.query || (card.dataset.search || "").includes(this.query);
      const roleId = card.dataset.roleId || "";
      const matchesRole = !this.roleFilter || (this.roleFilter === "__none" ? !roleId : roleId === this.roleFilter);
      card.classList.toggle("is-search-hidden", !matchesQuery || !matchesRole);
    });
  }

  private renderCanvas(canvas: HTMLElement): void {
    const { activities, tasks, releases, stories } = this.plugin.data;
    const slotActivities: Activity[] = [];
    const slots = activities.flatMap(activity => {
      const children = tasks.filter(task => task.activityId === activity.id);
      slotActivities.push(...Array<Activity>(Math.max(1, children.length)).fill(activity));
      return children.length ? children : [undefined];
    });
    const activityRow = canvas.createDiv("story-map-activity-row");
    activityRow.createDiv({ text: t("活动 Activity"), cls: "story-map-axis-label" });
    activities.forEach(activity => {
      const activityTasks = tasks.filter(t => t.activityId === activity.id);
      const box = activityRow.createDiv("story-map-activity"); box.id = `activity-${activity.id}`;
      box.setAttribute("data-label", t("活动 Activity"));
      box.style.gridColumn = `span ${Math.max(1, activityTasks.length)}`;
      const name = box.createSpan({ text: activity.title, cls: "story-map-activity-name" });
      name.onclick = event => { event.stopPropagation(); this.renameActivity(activity); };
      box.oncontextmenu = e => this.activityMenu(e, activity);
    });
    const addActivity = activityRow.createEl("button", { text: `+ ${t("活动 Activity")}`, cls: "story-map-add-activity" }); addActivity.onclick = () => this.addActivity();
    const taskRow = canvas.createDiv("story-map-task-row");
    taskRow.createDiv({ text: t("任务 Task"), cls: "story-map-axis-label" });
    slots.forEach((task, index) => {
      const box = taskRow.createDiv("story-map-task");
      box.dataset.activityId = slotActivities[index]?.id || "";
      if (!task) {
        const activity = slotActivities[index];
        box.addClass("is-activity-start", "is-activity-end");
        box.createEl("button", { text: `+ ${t("任务 Task")}` }).onclick = () => { if (activity) this.addTask(activity); };
        return;
      }
      box.dataset.taskId = task.id;
      const taskName = box.createSpan({ text: task.title, cls: "story-map-task-name" }); taskName.onclick = event => { event.stopPropagation(); this.renameTask(task); };
      const siblings = tasks.filter(item => item.activityId === task.activityId);
      if (siblings[0]?.id === task.id) box.addClass("is-activity-start");
      const isLastTask = siblings[siblings.length - 1]?.id === task.id;
      if (isLastTask) {
        box.addClass("is-activity-end");
        const add = box.createEl("button", { text: `+ ${t("任务 Task")}`, cls: "story-map-add-task-after", attr: { "aria-label": t("在{0}右侧添加 Task", task.title), title: t("追加 Task") } });
        add.onclick = event => { event.stopPropagation(); const activity = activities.find(item => item.id === task.activityId); if (activity) this.addTask(activity, task); };
      }
      box.oncontextmenu = e => this.taskMenu(e, task);
    });
    releases.forEach(release => this.renderRelease(canvas, release, slots, stories));
    const addMilestone = canvas.createDiv("story-map-add-milestone-row");
    const addMilestoneButton = addMilestone.createEl("button", { text: t("+ 里程碑"), attr: { "aria-label": t("添加或管理里程碑") } });
    addMilestoneButton.onclick = () => new CreateItemModal(this.plugin, t("添加里程碑"), (title, subtitle) => {
      this.plugin.data.releases.push({ id: uid("milestone"), title, subtitle });
    }, "", true).open();
  }

  private renderRelease(canvas: HTMLElement, release: Release, tasks: Array<Task | undefined>, stories: Story[]): void {
    const row = canvas.createDiv("story-map-release-row");
    const label = row.createDiv("story-map-release-label");
    const editField = (field: "title" | "subtitle", caption: string): void => {
      const text = label.createEl("button", { text: release[field] || caption, cls: `story-map-release-text story-map-release-${field}`, attr: { "aria-label": caption } });
      text.toggleClass("is-empty", !release[field]);
      text.onclick = () => new MilestoneEditorModal(this.plugin, release).open();
    };
    editField("title", t("里程碑名称")); editField("subtitle", t("里程碑说明"));
    const more = label.createEl("button", { text: "⋯", cls: "story-map-release-more", attr: { "aria-label": t("里程碑管理") } });
    more.onclick = event => {
      const menu = new Menu();
      menu.addItem(item => item.setTitle(t("删除里程碑")).setIcon("trash").setDisabled(this.plugin.data.stories.some(story => story.releaseId === release.id)).onClick(() => {
        if (this.plugin.data.stories.some(story => story.releaseId === release.id)) return;
        this.plugin.data.releases = this.plugin.data.releases.filter(item => item.id !== release.id);
        void this.plugin.commit();
      }));
      menu.showAtMouseEvent(event);
    };
    const columns = row.createDiv("story-map-release-columns");
    tasks.forEach(task => {
      const col = columns.createDiv("story-map-story-column");
      if (!task) { col.addClass("is-activity-start", "is-activity-end"); return; }
      col.dataset.taskId = task.id; col.dataset.releaseId = release.id;
      const siblings = tasks.filter((item): item is Task => !!item && item.activityId === task.activityId);
      if (siblings[0]?.id === task.id) col.addClass("is-activity-start");
      if (siblings[siblings.length - 1]?.id === task.id) col.addClass("is-activity-end");
      col.ondragover = e => { e.preventDefault(); col.addClass("is-drop-target"); };
      col.ondragleave = () => col.removeClass("is-drop-target");
      col.ondrop = e => {
        e.preventDefault(); col.removeClass("is-drop-target");
        const storyId = e.dataTransfer?.getData("text/story-id");
        if (storyId) this.moveStory(storyId, task, release);
      };
      stories.filter(story => story.taskId === task.id && story.releaseId === release.id).forEach(story => this.renderStory(col, story, task, release));
      const addStory = col.createEl("button", { text: `+ ${t("故事")}`, cls: "story-map-add-story", attr: { "aria-label": t("在{0}的{1}下添加 Story", release.title, task.title) } });
      addStory.onclick = event => { event.stopPropagation(); this.addStory(task, release); };
    });
  }

  private renderStory(parent: HTMLElement, story: Story, task: Task, release: Release): void {
    const card = parent.createDiv(`story-map-card color-${story.color}${this.selectedId === story.id ? " is-selected" : ""}`);
    card.dataset.search = `${story.title} ${story.tags.join(" ")}`.toLowerCase(); card.dataset.roleId = story.roleId || "";
    card.draggable = true; card.ondragstart = e => e.dataTransfer?.setData("text/story-id", story.id);
    card.ondragover = e => { e.preventDefault(); e.stopPropagation(); card.addClass("is-insert-target"); };
    card.ondragleave = () => card.removeClass("is-insert-target");
    card.ondrop = e => { e.preventDefault(); e.stopPropagation(); card.removeClass("is-insert-target"); const storyId = e.dataTransfer?.getData("text/story-id"); if (storyId && storyId !== story.id) this.moveStory(storyId, task, release, story.id); };
    card.createEl("strong", { text: story.title });
    const assignedRole = this.plugin.data.roles.find(role => role.id === story.roleId);
    if (assignedRole) {
      const roles = card.createDiv("story-map-card-roles"); roles.createSpan({ text: assignedRole.name, attr: { title: assignedRole.description || assignedRole.name } });
    }
    const meta = card.createDiv("story-map-card-meta"); meta.createSpan({ text: story.status === "doing" ? t("进行中") : story.status === "done" ? t("已完成") : story.status === "planned" ? t("已规划") : t("想法") });
    meta.createSpan({ text: t("{0} 点", story.estimate) });
    card.onclick = () => {
      this.selectedId = story.id; this.inspectorOpen = true;
      const body = card.closest<HTMLElement>(".story-map-body");
      if (!body) return;
      body.querySelectorAll(".story-map-card.is-selected").forEach(element => element.removeClass("is-selected"));
      card.addClass("is-selected");
      window.clearTimeout(this.selectTimer);
      this.selectTimer = window.setTimeout(() => {
        if (!body.isConnected) return;
        body.addClass("has-inspector");
        body.querySelector(".story-map-inspector")?.remove();
        this.renderInspector(body);
      }, 300);
    };
    card.ondblclick = () => { window.clearTimeout(this.selectTimer); new StoryEditorModal(this.plugin, story).open(); };
    card.oncontextmenu = e => this.storyMenu(e, story);
  }

  private renderInspector(parent: HTMLElement): void {
    const panel = parent.createEl("aside", { cls: "story-map-inspector" });
    const story = this.plugin.data.stories.find(s => s.id === this.selectedId);
    const heading = panel.createDiv("story-map-panel-heading"); heading.createEl("strong", { text: t("故事详情") });
    this.iconButton(heading, "x", t("关闭详情"), () => { this.inspectorOpen = false; this.render(); });
    if (!story) { panel.createDiv({ text: t("选择一张故事卡查看详情"), cls: "story-map-empty" }); return; }
    const title = panel.createEl("input", { value: story.title, cls: "story-map-inspector-title", attr: { "aria-label": t("故事标题") } }); title.onchange = () => { story.title = title.value.trim() || t("未命名故事"); void this.plugin.commit(); };
    this.selectField(panel, t("状态"), story.status, [["idea", t("想法")], ["planned", t("已规划")], ["doing", t("进行中")], ["done", t("已完成")]], v => { story.status = v as Story["status"]; });
    this.selectField(panel, t("优先级"), story.priority, [["low", t("低")], ["medium", t("中")], ["high", t("高")]], v => { story.priority = v as Story["priority"]; });
    const roleField = this.field(panel, t("角色")); const roleChoices = roleField.createDiv("story-map-role-choices");
    const roleSelect = roleChoices.createEl("select", { attr: { "aria-label": t("Story 所属角色") } }); roleSelect.createEl("option", { value: "", text: t("未分配") });
    this.plugin.data.roles.forEach(role => roleSelect.createEl("option", { value: role.id, text: role.name })); roleSelect.value = story.roleId || "";
    roleSelect.onchange = () => { story.roleId = roleSelect.value || undefined; void this.plugin.commit(); };
    const manageRoles = roleChoices.createEl("button", { text: this.plugin.data.roles.length ? t("管理角色") : t("+ 添加角色"), cls: "story-map-manage-roles", attr: { "aria-label": t("添加、编辑或删除角色") } });
    manageRoles.onclick = () => new RoleManagerModal(this.plugin).open();
    const estimate = this.field(panel, t("估点")).createEl("input", { type: "number", value: String(story.estimate), attr: { min: "0" } });
    estimate.onchange = () => { story.estimate = Math.max(0, Number(estimate.value) || 0); void this.plugin.commit(); };
    const tags = this.field(panel, t("标签")).createEl("input", { value: story.tags.join(", ") }); tags.onchange = () => { story.tags = tags.value.split(/[,，]/).map(x => x.trim()).filter(Boolean); void this.plugin.commit(); };
    const desc = this.field(panel, t("描述")).createEl("textarea"); desc.value = story.description; desc.onchange = () => { story.description = desc.value; void this.plugin.commit(); };
    noteSelector(this.field(panel, t("关联笔记")), this.plugin, story.notePath, path => { story.notePath = path; void this.plugin.commit(); });
    const actions = panel.createDiv("story-map-inspector-actions");
    if (!story.notePath) actions.createEl("button", { text: t("创建笔记") }).onclick = () => void this.plugin.openStoryNote(story);
    const edit = actions.createEl("button", { text: t("编辑全部") }); edit.onclick = () => new StoryEditorModal(this.plugin, story).open();
  }

  private field(parent: HTMLElement, label: string): HTMLElement { const row = parent.createDiv("story-map-field"); row.createEl("label", { text: label }); return row; }
  private selectField(parent: HTMLElement, label: string, current: string, options: string[][], change: (value: string) => void): void {
    const select = this.field(parent, label).createEl("select"); options.forEach(([value, text]) => select.createEl("option", { value, text })); select.value = current;
    select.onchange = () => { change(select.value); void this.plugin.commit(); };
  }
  private addStory(task: Task, release?: Release): void {
    const story: Story = { id: uid("story"), title: t("新用户故事"), activityId: task.activityId, taskId: task.id, releaseId: release?.id || this.plugin.data.releases[0]?.id || "mvp", description: "", status: "idea", priority: "medium", estimate: 3, tags: [], color: "yellow" };
    story.title = "";
    story.estimate = 0;
    new StoryEditorModal(this.plugin, story, savedStory => {
      this.plugin.data.stories.push(savedStory);
      this.selectedId = savedStory.id;
      this.inspectorOpen = true;
    }).open();
  }
  private addActivity(): void {
    new CreateItemModal(this.plugin, t("添加 Activity"), title => { this.plugin.data.activities.push({ id: uid("activity"), title }); }).open();
  }
  private addTask(activity: Activity, afterTask?: Task): void {
    new CreateItemModal(this.plugin, t("添加 Task"), value => {
      const tasks = this.plugin.data.tasks;
      let insertAt = afterTask ? tasks.findIndex(task => task.id === afterTask.id) + 1 : -1;
      if (!afterTask) tasks.forEach((task, index) => { if (task.activityId === activity.id) insertAt = index + 1; });
      tasks.splice(insertAt < 0 ? tasks.length : insertAt, 0, { id: uid("task"), title: value, activityId: activity.id });
    }, activity.title).open();
  }
  private renameActivity(activity: Activity): void {
    const element = Array.from(this.contentEl.querySelectorAll<HTMLElement>(".story-map-activity")).find(item => item.id === `activity-${activity.id}`)?.querySelector<HTMLElement>(".story-map-activity-name");
    if (element) this.inlineEdit(element, activity.title, value => { activity.title = value; });
  }
  private renameTask(task: Task): void {
    const element = Array.from(this.contentEl.querySelectorAll<HTMLElement>(".story-map-task")).find(item => item.dataset.taskId === task.id)?.querySelector<HTMLElement>(".story-map-task-name");
    if (element) this.inlineEdit(element, task.title, value => { task.title = value; });
  }
  private inlineEdit(element: HTMLElement, initial: string, save: (value: string) => void, allowEmpty = false): void {
    const input = createEl("input"); input.className = "story-map-inline-input"; input.value = initial;
    if (element.matches(".story-map-add-activity")) input.addClass("story-map-inline-activity");
    input.setAttribute("aria-label", element.getAttribute("aria-label") || t("修改名称"));
    input.title = t("Enter 保存 · Esc 取消");
    element.replaceWith(input); input.scrollIntoView({ block: "nearest", inline: "nearest" }); input.focus(); input.select();
    let done = false;
    const finish = (cancel: boolean): void => {
      if (done) return; done = true;
      const value = input.value.trim(); input.replaceWith(element);
      if (!cancel && (value || allowEmpty) && value !== initial) { save(value); void this.plugin.commit(); }
    };
    input.onblur = () => finish(false);
    input.onkeydown = event => {
      event.stopPropagation(); if (event.isComposing) return;
      if (event.key === "Enter") { event.preventDefault(); finish(false); }
      if (event.key === "Escape") { event.preventDefault(); finish(true); }
    };
  }
  private moveStory(storyId: string, task: Task, release: Release, beforeId?: string): void {
    const stories = this.plugin.data.stories;
    const from = stories.findIndex(story => story.id === storyId);
    if (from < 0) return;
    const [story] = stories.splice(from, 1);
    if (!story) return;
    story.taskId = task.id; story.activityId = task.activityId; story.releaseId = release.id;
    if (beforeId) {
      const target = stories.findIndex(item => item.id === beforeId);
      stories.splice(target < 0 ? stories.length : target, 0, story);
    } else {
      let target = -1;
      stories.forEach((item, index) => { if (item.taskId === task.id && item.releaseId === release.id) target = index; });
      stories.splice(target + 1, 0, story);
    }
    void this.plugin.commit();
  }
  private storyMenu(event: MouseEvent, story: Story): void { event.preventDefault(); const menu = new Menu().setUseNativeMenu(false); menu.addItem(i => i.setTitle(t("编辑")).setIcon("pencil").onClick(() => new StoryEditorModal(this.plugin, story).open())); menu.addItem(i => i.setTitle(t("打开关联笔记")).setIcon("file-text").onClick(() => void this.plugin.openStoryNote(story))); menu.addSeparator(); menu.addItem(i => i.setTitle(t("删除")).setIcon("trash").onClick(() => { this.plugin.data.stories.remove(story); this.selectedId = null; void this.plugin.commit(); })); menu.showAtMouseEvent(event); }
  private activityMenu(event: MouseEvent, activity: Activity): void {
    event.preventDefault(); const menu = new Menu().setUseNativeMenu(false);
    menu.addItem(i => i.setTitle(t("添加 Task")).setIcon("plus").onClick(() => this.addTask(activity)));
    menu.addItem(i => i.setTitle(t("修改名称")).setIcon("pencil").onClick(() => this.renameActivity(activity)));
    const taskCount = this.plugin.data.tasks.filter(task => task.activityId === activity.id).length;
    menu.addSeparator();
    menu.addItem(i => i.setTitle(taskCount ? t("包含 {0} 个 Task，不能删除", taskCount) : t("删除 Activity")).setIcon("trash").setDisabled(taskCount > 0).onClick(() => {
      if (this.plugin.data.tasks.some(task => task.activityId === activity.id)) { new Notice(t("这个 Activity 下面还有 Task，不能删除")); return; }
      this.plugin.data.activities.remove(activity); void this.plugin.commit();
    }));
    menu.showAtMouseEvent(event);
  }
  private taskMenu(event: MouseEvent, task: Task): void {
    event.preventDefault(); const activity = this.plugin.data.activities.find(item => item.id === task.activityId); const menu = new Menu().setUseNativeMenu(false);
    if (activity) menu.addItem(i => i.setTitle(t("在右侧添加 Task")).setIcon("plus").onClick(() => this.addTask(activity, task)));
    menu.addItem(i => i.setTitle(t("修改名称")).setIcon("pencil").onClick(() => this.renameTask(task)));
    const storyCount = this.plugin.data.stories.filter(story => story.taskId === task.id).length;
    menu.addSeparator();
    menu.addItem(i => i.setTitle(storyCount ? t("包含 {0} 个 Story，不能删除", storyCount) : t("删除 Task")).setIcon("trash").setDisabled(storyCount > 0).onClick(() => {
      if (this.plugin.data.stories.some(story => story.taskId === task.id)) { new Notice(t("这个 Task 下面还有 Story，不能删除")); return; }
      this.plugin.data.tasks.remove(task); void this.plugin.commit();
    }));
    menu.showAtMouseEvent(event);
  }
}

export default class StoryMapPlugin extends Plugin {
  private mapFile: TFile | null = null;
  private sessionOwner: StoryMapPlugin | null = null;
  private fileSessions = new Map<TFile, Promise<StoryMapPlugin>>();
  private diskSnapshot: string | undefined;
  conflicted = false;
  activeEditors = 0;
  private pendingWrites = 0;
  private noteRenameQueue: Promise<void> = Promise.resolve();
  async refreshExternal(): Promise<void> {
    if (!this.mapFile || this.pendingWrites) return;
    const raw = await this.app.vault.read(this.mapFile);
    if (this.pendingWrites) return;
    if (raw === this.diskSnapshot) return;
    if (this.activeEditors || (this.diskSnapshot !== undefined && JSON.stringify(this.data) !== JSON.stringify(this.parseMap(this.diskSnapshot)))) {
      this.conflicted = true; this.saveStatus = "地图已被外部修改，已停止保存；请先备份当前修改"; this.refresh(); return;
    }
    this.data = this.parseMap(raw); this.diskSnapshot = raw; this.lastSerialized = JSON.stringify(this.data);
    this.history = []; this.future = []; this.conflicted = false; this.refresh();
  }
  async resolveConflict(): Promise<void> {
    if (!this.mapFile) return;
    await this.saveQueue;
    const raw = await this.app.vault.read(this.mapFile);
    const data = this.parseMap(raw);
    const path = this.mapFile.path.replace(/\.storymap$/i, `-conflict-${uid("backup")}.storymap`);
    await this.app.vault.create(path, JSON.stringify(this.data, null, 2));
    this.data = data; this.diskSnapshot = raw; this.lastSerialized = JSON.stringify(data);
    this.history = []; this.future = []; this.conflicted = false;
    this.saveStatus = "已载入 .story-map.json"; this.refresh(); new Notice(path);
  }
  async updateNotePaths(oldPath: string, newPath: string): Promise<void> {
    const update = (data: StoryMapData): boolean => {
      let changed = false;
      for (const story of data.stories) if (story.notePath === oldPath || story.notePath?.startsWith(oldPath + "/")) {
        story.notePath = newPath + story.notePath.slice(oldPath.length); changed = true;
      }
      return changed;
    };
    if (update(this.data)) await this.commit(false);
    for (const file of this.app.vault.getFiles().filter(file => file.extension === "storymap")) {
      const pending = this.fileSessions.get(file);
      if (pending) { const session = await pending; if (update(session.data)) await session.commit(false); }
      else await this.app.vault.process(file, raw => { const data = this.parseMap(raw); return update(data) ? JSON.stringify(data, null, 2) : raw; });
    }
  }
  async fileSession(file: TFile): Promise<StoryMapPlugin> {
    const owner = this.sessionOwner || this;
    const existing = owner.fileSessions.get(file);
    if (existing) return existing;
    const pending = owner.loadFileSession(file);
    owner.fileSessions.set(file, pending);
    try { return await pending; } catch (cause) { owner.fileSessions.delete(file); throw cause; }
  }
  private async loadFileSession(file: TFile): Promise<StoryMapPlugin> {
    const raw = await this.app.vault.read(file);
    const data = this.parseMap(raw);
    const session = new StoryMapPlugin(this.app, this.manifest);
    session.sessionOwner = this.sessionOwner || this;
    session.mapFile = file; session.mapPath = file.path; session.data = data;
    session.language = this.language; session.exportFormat = this.exportFormat;
    session.lastSerialized = JSON.stringify(data);
    session.diskSnapshot = raw;
    return session;
  }
  async createMapFile(folder: TFolder, title: string, sample = false): Promise<void> {
    const name = title.trim().replace(/\.storymap$/i, "");
    if (!name || /[\\/:*?"<>|]/.test(name) || name === "." || name === "..") throw new Error("Invalid file name");
    const data = cloneDefault(); data.title = name;
    // Start with a complete, localized example that can be edited in place.
    // Do not attach new maps to the sample's suggested note paths.
    data.stories.forEach(story => { delete story.notePath; story.status = "planned"; });
    if (!sample) {
      data.activities = [{ id: uid("activity"), title: t("新活动") }];
      data.tasks = [{ id: uid("task"), title: t("新任务"), activityId: data.activities[0]!.id }];
      data.releases = [{ id: uid("milestone"), title: "MVP", subtitle: "" }];
      data.roles = [];
      data.stories = [];
    }
    const path = normalizePath(`${folder.isRoot() ? "" : folder.path + "/"}${name}.storymap`);
    const file = await this.app.vault.create(path, JSON.stringify(data, null, 2));
    await this.app.workspace.getLeaf("tab").openFile(file);
  }
  mapPath = DATA_PATH;
  private mapBusy = false;
  saveStatusText(): string { return t(this.saveStatus).replace(".story-map.json", this.mapPath); }
  language: Language = "auto";
  exportFormat: ExportFormat = "png";
  async savePreferences(): Promise<void> {
    if (this.sessionOwner) { this.sessionOwner.language = this.language; this.sessionOwner.exportFormat = this.exportFormat; await this.sessionOwner.savePreferences(); return; }
    await this.saveData({ language: this.language, exportFormat: this.exportFormat, mapPath: this.mapPath });
  }
  data: StoryMapData = cloneDefault();
  private history: string[] = [];
  private future: string[] = [];
  private lastSerialized = JSON.stringify(this.data);
  saveStatus = "已载入 .story-map.json";
  private saveQueue: Promise<void> = Promise.resolve();
  private saveRevision = 0;
  private loadFailed = false;
  private hostLanguage(): string { return getLanguage(); }
  async changeLanguage(language: Language): Promise<void> {
    this.language = language;
    setLocale(language, this.hostLanguage());
    this.refresh();
    try { await this.savePreferences(); } catch { new Notice(t("语言设置保存失败")); }
  }
  async onload(): Promise<void> {
    const settings: unknown = await this.loadData();
    const savedPath = settings && typeof settings === "object" && "mapPath" in settings ? settings.mapPath : undefined;
    if (typeof savedPath === "string" && /^\.story-maps\/[a-z0-9-]+\.json$/.test(savedPath)) this.mapPath = savedPath;
    const format = settings && typeof settings === "object" && "exportFormat" in settings ? settings.exportFormat : undefined;
    this.exportFormat = format === "pdf" || format === "xmind" || format === "json" ? format : "png";
    const language = settings && typeof settings === "object" && "language" in settings ? settings.language : undefined;
    this.language = isLanguage(language) ? language : "auto";
    setLocale(this.language, this.hostLanguage());
    await this.loadMap();
    this.registerView(VIEW_TYPE, leaf => new StoryMapView(leaf, this));
    this.registerExtensions(["storymap"], VIEW_TYPE);
    this.registerEvent(this.app.vault.on("modify", file => {
      if (file instanceof TFile) {
        const pending = this.fileSessions.get(file);
        if (pending) void pending.then(session => session.refreshExternal()).catch(() => new Notice(t("文件冲突")));
      }
    }));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if (file instanceof TFolder || (file instanceof TFile && file.extension === "md")) {
        this.noteRenameQueue = this.noteRenameQueue.then(() => this.updateNotePaths(oldPath, file.path)).catch(() => { new Notice(t("关联笔记更新失败")); });
      }
    }));
    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
      if (file instanceof TFolder) menu.setUseNativeMenu(false).addItem(item => item.setSection("action-primary").setTitle(t("新建故事地图")).setIcon("map").onClick(() => new CreateMapFileModal(this, file).open()));
    }));
    this.addRibbonIcon("map", t("打开故事地图"), () => void this.activateView());
    this.addCommand({ id: "open-map", name: t("打开故事地图"), callback: () => void this.activateView() });
    this.addCommand({ id: "reset-map", name: t("重置为示例地图"), callback: () => { this.snapshot(); this.data = cloneDefault(); void this.commit(false); } });
  }
  async activateView(): Promise<void> { let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE).find(item => !(item.view as StoryMapView).file); if (!leaf) { leaf = this.app.workspace.getLeaf("tab"); await leaf.setViewState({ type: VIEW_TYPE, active: true }); } await this.app.workspace.revealLeaf(leaf); }
  private async loadMap(): Promise<void> {
    try {
      if (await this.app.vault.adapter.exists(this.mapPath)) this.data = JSON.parse(await this.app.vault.adapter.read(this.mapPath)) as StoryMapData;
      else if (this.mapPath === DATA_PATH) this.data = cloneDefault();
      else throw new Error("Map file is missing");
      this.data.roles ||= [];
      this.data.stories.forEach(story => {
        const legacy = story as Story & { roleIds?: string[] };
        if (!story.roleId && legacy.roleIds?.length) story.roleId = legacy.roleIds[0];
        delete legacy.roleIds;
      });
    } catch {
      this.loadFailed = true;
      this.data = cloneDefault();
      this.saveStatus = "读取失败，已停止保存以保护原文件";
      new Notice(t("故事地图读取失败，已停止保存。请修复 .story-map.json 后重新加载插件。"), 10000);
    }
    this.lastSerialized = JSON.stringify(this.data);
  }
  private snapshot(): void { this.history.push(this.lastSerialized); if (this.history.length > 50) this.history.shift(); this.future = []; }
  async commitModal(action: () => void): Promise<boolean> {
    const before = JSON.stringify(this.data);
    const history = [...this.history], future = [...this.future], serialized = this.lastSerialized;
    const arrays = { activities: [...this.data.activities], tasks: [...this.data.tasks], releases: [...this.data.releases], stories: [...this.data.stories], roles: [...this.data.roles] };
    action();
    if (await this.commit()) return true;
    const restored = JSON.parse(before) as StoryMapData;
    for (const key of ["activities", "tasks", "releases", "stories", "roles"] as const) {
      arrays[key].forEach((item, index) => {
        for (const property of Object.keys(item)) if (!(property in restored[key][index]!)) Reflect.deleteProperty(item, property);
        Object.assign(item, restored[key][index]);
      });
    }
    Object.assign(this.data, restored, arrays);
    this.history = history; this.future = future; this.lastSerialized = serialized;
    this.refresh();
    return false;
  }
  async commit(track = true): Promise<boolean> {
    if (this.loadFailed) { new Notice(t(this.saveStatus)); return false; }
    if (track) this.snapshot();
    this.lastSerialized = JSON.stringify(this.data);
    const payload = JSON.stringify(this.data, null, 2);
    const path = this.mapPath;
    const file = this.mapFile;
    let saved = false;
    const revision = ++this.saveRevision;
    this.pendingWrites++;
    this.saveStatus = "正在保存…";
    this.refresh();
    this.saveQueue = this.saveQueue.then(async () => {
      try {
        if (file) {
          if (this.app.vault.getAbstractFileByPath(file.path) !== file) throw new Error("Map file was removed");
          await this.app.vault.process(file, current => {
            if (current !== this.diskSnapshot) throw new Error("external-map-change");
            return payload;
          });
          this.diskSnapshot = payload;
          this.mapPath = file.path;
        } else await this.app.vault.adapter.write(path, payload);
        saved = true;
        this.conflicted = false;
        if (revision === this.saveRevision) this.saveStatus = "已保存到 .story-map.json";
      } catch (cause) {
        if (cause instanceof Error && cause.message === "external-map-change") {
          this.conflicted = true;
          this.saveStatus = "地图已被外部修改，已停止保存；请先备份当前修改";
          new Notice(t(this.saveStatus), 10000);
        } else {
          if (revision === this.saveRevision) this.saveStatus = "保存失败，修改仍在内存中；请重试";
          new Notice(t("故事地图保存失败，请检查磁盘和文件权限。修改仍在内存中，请勿关闭插件。"), 10000);
        }
      }
      this.pendingWrites--;
      this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach(leaf => {
        const status = leaf.view.containerEl.querySelector(".story-map-save-status");
        if (status && leaf.view instanceof StoryMapView && leaf.view.owns(this)) status.textContent = this.saveStatusText();
      });
    });
    await this.saveQueue;
    if (this.conflicted) this.refresh();
    return saved;
  }
  async listMaps(): Promise<Array<{ path: string; data: StoryMapData }>> {
    const adapter = this.app.vault.adapter;
    const paths = [DATA_PATH];
    if (await adapter.exists(".story-maps")) paths.push(...(await adapter.list(".story-maps")).files.filter(path => /^\.story-maps\/[a-z0-9-]+\.json$/.test(path)));
    const entries = [];
    for (const path of paths) {
      if (path === this.mapPath) entries.push({ path, data: this.data });
      else if (await adapter.exists(path)) entries.push({ path, data: this.parseMap(await adapter.read(path)) });
    }
    return entries;
  }
  private parseMap(raw: string): StoryMapData {
    const data = JSON.parse(raw) as StoryMapData;
    if (!data || data.version !== 1 || typeof data.title !== "string" || ![data.activities, data.tasks, data.releases, data.stories, data.roles].every(Array.isArray)) throw new Error("Invalid map file");
    return data;
  }
  private async mapOperation(action: () => Promise<void>): Promise<void> {
    if (this.mapBusy) throw new Error(t("正在保存…"));
    this.mapBusy = true;
    try { if (!await this.commit(false)) throw new Error(t(this.saveStatus)); await action(); }
    finally { this.mapBusy = false; }
  }
  async createMap(title: string, mode: "blank" | "sample" | "copy"): Promise<void> {
    await this.mapOperation(async () => {
      const data = mode === "copy" ? JSON.parse(JSON.stringify(this.data)) as StoryMapData : cloneDefault();
      if (mode === "blank") { data.activities = []; data.tasks = []; data.stories = []; data.roles = []; data.releases = [{ id: uid("milestone"), title: "MVP", subtitle: "" }]; }
      data.title = title.trim() || t("用户故事地图"); delete data.archived;
      const adapter = this.app.vault.adapter;
      if (!await adapter.exists(".story-maps")) await adapter.mkdir(".story-maps");
      let path = `.story-maps/${uid("map")}.json`;
      while (await adapter.exists(path)) path = `.story-maps/${uid("map")}.json`;
      await adapter.write(path, JSON.stringify(data, null, 2));
      await this.activateMap(path, data);
    });
  }
  async switchMap(path: string): Promise<void> {
    if (path !== DATA_PATH && !/^\.story-maps\/[a-z0-9-]+\.json$/.test(path)) throw new Error("Invalid map path");
    await this.mapOperation(async () => { const data = this.parseMap(await this.app.vault.adapter.read(path)); await this.activateMap(path, data); });
  }
  private async activateMap(path: string, data: StoryMapData): Promise<void> {
    const previousPath = this.mapPath; this.mapPath = path;
    try { await this.savePreferences(); } catch (cause) { this.mapPath = previousPath; throw cause; }
    this.data = data; this.history = []; this.future = []; this.lastSerialized = JSON.stringify(data);
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach(leaf => { const view = leaf.view as StoryMapView; view.resetMapState(); });
    this.refresh();
  }
  async archiveMap(path: string, archived: boolean): Promise<void> {
    if (path === this.mapPath || (path !== DATA_PATH && !/^\.story-maps\/[a-z0-9-]+\.json$/.test(path))) throw new Error("Switch maps before archiving");
    await this.mapOperation(async () => { const data = this.parseMap(await this.app.vault.adapter.read(path)); data.archived = archived; await this.app.vault.adapter.write(path, JSON.stringify(data, null, 2)); });
  }
  undo(): void { const previous = this.history.pop(); if (!previous) return; this.future.push(JSON.stringify(this.data)); this.data = JSON.parse(previous) as StoryMapData; void this.commit(false); }
  redo(): void { const next = this.future.pop(); if (!next) return; this.history.push(JSON.stringify(this.data)); this.data = JSON.parse(next) as StoryMapData; void this.commit(false); }
  private refresh(): void { this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach(leaf => { const view = leaf.view; if (view instanceof StoryMapView && view.owns(this)) view.render(); }); }
  async exportMap(format: ExportFormat, doc: Document, write?: (bytes: ArrayBuffer) => Promise<string>): Promise<void> {
    if (format === "xmind") { await this.exportXMind(write); return; }
    const data = JSON.parse(JSON.stringify(this.data)) as StoryMapData;
    let output: ArrayBuffer;
    if (format === "json") output = new TextEncoder().encode(JSON.stringify(data, null, 2) + "\n").buffer;
    else if (format === "png" || format === "pdf") {
      const canvas = await renderMap(data, doc);
      try {
        output = format === "png" ? await canvasBytes(canvas, "image/png") : imagePdf(new Uint8Array(await canvasBytes(canvas, "image/jpeg")), canvas.width, canvas.height);
      } finally { canvas.width = 0; canvas.height = 0; }
    } else throw new Error(t("不支持的导出格式"));
    const path = write ? await write(output) : await this.saveExport(data.title, format, output);
    new Notice(t("已导出：{0}", path), 6000);
  }
  private exportQueue: Promise<unknown> = Promise.resolve();
  saveExport(title: string, format: ExportFormat, output: ArrayBuffer): Promise<string> {
    const folder = t("故事地图导出");
    const write = this.exportQueue.catch(() => undefined).then(async () => {
      if (!(await this.app.vault.adapter.exists(folder))) await this.app.vault.createFolder(folder);
      const safeTitle = title.replace(/[\\/:*?"<>|]/g, "-").trim() || t("用户故事地图");
      let path = normalizePath(`${folder}/${safeTitle}.${format}`); let sequence = 2;
      while (await this.app.vault.adapter.exists(path)) { path = normalizePath(`${folder}/${safeTitle}-${sequence}.${format}`); sequence += 1; }
      await this.app.vault.adapter.writeBinary(path, output);
      return path;
    });
    this.exportQueue = write;
    return write;
  }
  async exportXMind(write?: (bytes: ArrayBuffer) => Promise<string>): Promise<void> {
    const topic = (title: string, children: unknown[] = [], notes = "", labels: string[] = []): Record<string, unknown> => {
      const value: Record<string, unknown> = { id: uid("topic"), class: "topic", title };
      if (children.length) value.children = { attached: children };
      if (notes) value.notes = { plain: { content: notes } };
      if (labels.length) value.labels = labels;
      return value;
    };
    const storyTopic = (story: Story, includeLocation = false): Record<string, unknown> => {
      const role = this.data.roles.find(roleItem => roleItem.id === story.roleId);
      const roles = role ? [role.name] : [];
      const release = this.data.releases.find(item => item.id === story.releaseId);
      const taskItem = this.data.tasks.find(item => item.id === story.taskId);
      const activity = this.data.activities.find(item => item.id === story.activityId);
      const details = [story.description, t("里程碑：{0}", release?.title || t("未分配")), includeLocation && activity ? t("活动：{0}", activity.title) : "", includeLocation && taskItem ? t("任务：{0}", taskItem.title) : "", t("状态：{0}", t(STATUS_LABELS[story.status])), t("优先级：{0}", t(PRIORITY_LABELS[story.priority])), t("估点：{0}", story.estimate), story.tags.length ? t("标签：{0}", story.tags.join("、")) : "", roles.length ? t("角色：{0}", roles.join("、")) : "", story.notePath ? t("关联笔记：{0}", story.notePath) : ""].filter(Boolean).join("\n");
      return topic(story.title, [], details, roles);
    };
    const activityTopics = this.data.activities.map(activity => topic(activity.title,
      this.data.tasks.filter(taskItem => taskItem.activityId === activity.id).map(taskItem => topic(taskItem.title,
        this.data.stories.filter(story => story.taskId === taskItem.id).map(story => storyTopic(story))
      ))
    ));
    const releaseTopics = this.data.releases.map(release => topic(release.title,
      this.data.stories.filter(story => story.releaseId === release.id).map(story => storyTopic(story, true)), release.subtitle));
    const roleTopics = this.data.roles.map(role => topic(role.name, [], role.description));
    const rootChildren = [topic(t("用户旅程"), activityTopics), topic(t("发布计划"), releaseTopics)];
    if (roleTopics.length) rootChildren.push(topic(t("角色"), roleTopics));
    const sheetId = uid("sheet");
    const content = [{ id: sheetId, class: "sheet", title: this.data.title, rootTopic: { ...topic(this.data.title, rootChildren), structureClass: "org.xmind.ui.logic.right" }, topicOverlapping: "overlap" }];
    const metadata = { dataStructureVersion: "3", creator: { name: "Obsidian Story Map", version: PLUGIN_VERSION }, layoutEngineVersion: "5", activeSheetId: sheetId };
    const manifest = { "file-entries": { "content.json": {}, "metadata.json": {} } };
    const archive = zipSync({
      "content.json": strToU8(JSON.stringify(content)),
      "metadata.json": strToU8(JSON.stringify(metadata)),
      "manifest.json": strToU8(JSON.stringify(manifest)),
    }, { level: 6 });
    const output = new ArrayBuffer(archive.byteLength);
    new Uint8Array(output).set(archive);
    const path = write ? await write(output) : await this.saveExport(this.data.title, "xmind", output);
    new Notice(t("已导出 XMind：{0}", path), 6000);
  }
  async openStoryNote(story: Story): Promise<void> {
    if (story.notePath && !(this.app.vault.getAbstractFileByPath(story.notePath) instanceof TFile)) {
      new Notice(t("关联笔记不存在，请重新关联")); return;
    }
    const path = normalizePath(story.notePath || t("故事/{0}.md", story.title)); story.notePath = path;
    let file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      const folder = path.split("/").slice(0, -1).join("/"); if (folder && !(await this.app.vault.adapter.exists(folder))) await this.app.vault.createFolder(folder);
      file = await this.app.vault.create(path, `---\nstatus: ${story.status}\npriority: ${story.priority}\nestimate: ${story.estimate}\ntags: [${story.tags.join(", ")}]\n---\n\n# ${story.title}\n\n${story.description}\n\n## ${t("验收标准")}\n\n- [ ] \n`);
      await this.commit(false);
    }
    if (file instanceof TFile) await this.app.workspace.getLeaf("tab").openFile(file);
  }
}
