import { ItemView, Menu, Modal, Notice, Plugin, TFile, WorkspaceLeaf, normalizePath, setIcon } from "obsidian";
import JSZip from "jszip";
import { DEFAULT_MAP } from "./data";
import type { Activity, Release, Story, StoryMapData, Task } from "./types";

const VIEW_TYPE = "story-map-view";
const DATA_PATH = ".story-map.json";
const PLUGIN_VERSION = "0.8.6";

function cloneDefault(): StoryMapData { return JSON.parse(JSON.stringify(DEFAULT_MAP)) as StoryMapData; }
function uid(prefix: string): string { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`; }

class NameModal extends Modal {
  constructor(private plugin: StoryMapPlugin, private heading: string, private label: string, private initialValue: string, private saveValue: (value: string) => void) { super(plugin.app); }
  onOpen(): void {
    this.contentEl.addClass("story-map-modal");
    this.contentEl.createEl("h2", { text: this.heading });
    const row = this.contentEl.createDiv("story-map-form-row"); row.createEl("label", { text: this.label });
    const input = row.createEl("input", { value: this.initialValue });
    const actions = this.contentEl.createDiv("story-map-modal-actions");
    actions.createEl("button", { text: "取消" }).onclick = () => this.close();
    const save = actions.createEl("button", { text: "保存", cls: "mod-cta" });
    const submit = (): void => { const value = input.value.trim(); if (!value) return; this.saveValue(value); void this.plugin.commit(); this.close(); };
    save.onclick = submit; input.onkeydown = event => { if (event.key === "Enter") submit(); };
    window.setTimeout(() => { input.focus(); input.select(); }, 0);
  }
  onClose(): void { this.contentEl.empty(); }
}

class ActivityEditorModal extends Modal {
  constructor(private plugin: StoryMapPlugin, private saveActivity: (activityName: string, taskName: string) => void) { super(plugin.app); }
  onOpen(): void {
    this.contentEl.addClass("story-map-modal"); this.contentEl.createEl("h2", { text: "添加 Activity" });
    const activityRow = this.contentEl.createDiv("story-map-form-row"); activityRow.createEl("label", { text: "Activity 名称" });
    const activityInput = activityRow.createEl("input", { placeholder: "例如：进入系统" });
    const taskRow = this.contentEl.createDiv("story-map-form-row"); taskRow.createEl("label", { text: "第一个 Task" });
    const taskInput = taskRow.createEl("input", { placeholder: "例如：注册账号" });
    const actions = this.contentEl.createDiv("story-map-modal-actions"); actions.createEl("button", { text: "取消" }).onclick = () => this.close();
    const save = actions.createEl("button", { text: "创建", cls: "mod-cta" });
    save.onclick = () => { const activityName = activityInput.value.trim(); const taskName = taskInput.value.trim(); if (!activityName || !taskName) return; this.saveActivity(activityName, taskName); void this.plugin.commit(); this.close(); };
    window.setTimeout(() => activityInput.focus(), 0);
  }
  onClose(): void { this.contentEl.empty(); }
}

class RoleManagerModal extends Modal {
  constructor(private plugin: StoryMapPlugin) { super(plugin.app); }
  onOpen(): void { this.renderRoles(); }
  private renderRoles(): void {
    const { contentEl } = this; contentEl.empty(); contentEl.addClass("story-map-modal", "story-map-role-modal");
    contentEl.createEl("h2", { text: "角色管理" });
    contentEl.createEl("p", { text: "角色属于整张地图，可分配给任意用户故事。", cls: "story-map-modal-help" });
    const list = contentEl.createDiv("story-map-role-list");
    this.plugin.data.roles.forEach(role => {
      const row = list.createDiv("story-map-role-row");
      const name = row.createEl("input", { value: role.name, attr: { "aria-label": "角色名称" } });
      const description = row.createEl("input", { value: role.description, placeholder: "角色说明", attr: { "aria-label": "角色说明" } });
      const remove = row.createEl("button", { text: "删除", attr: { "aria-label": `删除角色 ${role.name}` } });
      name.onchange = () => { role.name = name.value.trim() || "未命名角色"; void this.plugin.commit(); };
      description.onchange = () => { role.description = description.value.trim(); void this.plugin.commit(); };
      remove.onclick = () => {
        this.plugin.data.roles.remove(role);
        this.plugin.data.stories.forEach(story => { if (story.roleId === role.id) story.roleId = undefined; });
        void this.plugin.commit(); this.renderRoles();
      };
    });
    if (!this.plugin.data.roles.length) list.createDiv({ text: "还没有角色", cls: "story-map-empty" });
    const actions = contentEl.createDiv("story-map-modal-actions");
    const add = actions.createEl("button", { text: "+ 角色" }); add.onclick = () => { this.plugin.data.roles.push({ id: uid("role"), name: "新角色", description: "" }); void this.plugin.commit(); this.renderRoles(); };
    const done = actions.createEl("button", { text: "完成", cls: "mod-cta" }); done.onclick = () => this.close();
  }
  onClose(): void { this.contentEl.empty(); }
}

class MilestoneManagerModal extends Modal {
  constructor(private plugin: StoryMapPlugin) { super(plugin.app); }
  onOpen(): void { this.renderMilestones(); }
  private renderMilestones(): void {
    const { contentEl } = this; contentEl.empty(); contentEl.addClass("story-map-modal", "story-map-milestone-modal");
    contentEl.createEl("h2", { text: "里程碑管理" });
    contentEl.createEl("p", { text: "里程碑决定 Story 所在的横向发布切片。包含 Story 的里程碑不能删除。", cls: "story-map-modal-help" });
    const list = contentEl.createDiv("story-map-milestone-list");
    this.plugin.data.releases.forEach(release => {
      const storyCount = this.plugin.data.stories.filter(story => story.releaseId === release.id).length;
      const row = list.createDiv("story-map-milestone-row");
      const title = row.createEl("input", { value: release.title, attr: { "aria-label": "里程碑名称" } });
      const subtitle = row.createEl("input", { value: release.subtitle, placeholder: "说明", attr: { "aria-label": "里程碑说明" } });
      const remove = row.createEl("button", { text: storyCount ? `${storyCount} Story` : "删除", attr: { "aria-label": storyCount ? `该里程碑包含 ${storyCount} 个 Story，不能删除` : `删除里程碑 ${release.title}` } });
      remove.disabled = storyCount > 0; remove.title = storyCount ? "请先将 Story 移动到其他里程碑" : "删除里程碑";
      title.onchange = () => { release.title = title.value.trim() || "未命名里程碑"; void this.plugin.commit(); };
      subtitle.onchange = () => { release.subtitle = subtitle.value.trim(); void this.plugin.commit(); };
      remove.onclick = () => {
        if (this.plugin.data.stories.some(story => story.releaseId === release.id)) { new Notice("这个里程碑下面还有 Story，不能删除"); this.renderMilestones(); return; }
        this.plugin.data.releases.remove(release); void this.plugin.commit(); this.renderMilestones();
      };
    });
    if (!this.plugin.data.releases.length) list.createDiv({ text: "还没有里程碑", cls: "story-map-empty" });
    const actions = contentEl.createDiv("story-map-modal-actions");
    const add = actions.createEl("button", { text: "+ 里程碑" });
    add.onclick = () => { this.plugin.data.releases.push({ id: uid("milestone"), title: "新里程碑", subtitle: "" }); void this.plugin.commit(); this.renderMilestones(); };
    const done = actions.createEl("button", { text: "完成", cls: "mod-cta" }); done.onclick = () => this.close();
  }
  onClose(): void { this.contentEl.empty(); }
}

class StoryEditorModal extends Modal {
  constructor(private plugin: StoryMapPlugin, private story: Story, private saveStory?: (story: Story) => void) { super(plugin.app); }
  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("story-map-modal");
    contentEl.createEl("h2", { text: this.saveStory ? "添加故事" : "编辑故事" });
    const fields: Array<[string, keyof Story, "text" | "number" | "textarea"]> = [
      ["故事标题", "title", "text"], ["故事描述", "description", "textarea"], ["估点", "estimate", "number"], ["关联笔记", "notePath", "text"]
    ];
    const controls: Partial<Record<keyof Story, HTMLInputElement | HTMLTextAreaElement>> = {};
    fields.forEach(([label, key, type]) => {
      const row = contentEl.createDiv("story-map-form-row"); row.createEl("label", { text: label });
      const control = type === "textarea" ? row.createEl("textarea") : row.createEl("input", { type });
      control.value = String(this.story[key] ?? ""); controls[key] = control;
    });
    const roleRow = contentEl.createDiv("story-map-form-row"); roleRow.createEl("label", { text: "角色" });
    const roleSelect = roleRow.createEl("select"); roleSelect.createEl("option", { value: "", text: "未分配角色" });
    this.plugin.data.roles.forEach(role => roleSelect.createEl("option", { value: role.id, text: role.name })); roleSelect.value = this.story.roleId || "";
    const statusRow = contentEl.createDiv("story-map-form-row"); statusRow.createEl("label", { text: "状态" });
    const statusSelect = statusRow.createEl("select");
    [["idea", "想法"], ["planned", "已规划"], ["doing", "进行中"], ["done", "已完成"]].forEach(([value, text]) => statusSelect.createEl("option", { value, text }));
    statusSelect.value = this.story.status;
    const priorityRow = contentEl.createDiv("story-map-form-row"); priorityRow.createEl("label", { text: "优先级" });
    const prioritySelect = priorityRow.createEl("select");
    [["low", "低"], ["medium", "中"], ["high", "高"]].forEach(([value, text]) => prioritySelect.createEl("option", { value, text }));
    prioritySelect.value = this.story.priority;
    const tagsRow = contentEl.createDiv("story-map-form-row"); tagsRow.createEl("label", { text: "标签" });
    const tagsInput = tagsRow.createEl("input", { value: this.story.tags.join(", "), placeholder: "用逗号分隔" });
    const actions = contentEl.createDiv("story-map-modal-actions");
    const cancel = actions.createEl("button", { text: "取消" }); cancel.onclick = () => this.close();
    const save = actions.createEl("button", { text: "保存", cls: "mod-cta" });
    save.onclick = () => {
      this.story.title = controls.title?.value.trim() || "未命名故事";
      this.story.description = controls.description?.value.trim() || "";
      this.story.estimate = Number(controls.estimate?.value) || 0;
      this.story.notePath = controls.notePath?.value.trim() || undefined;
      this.story.roleId = roleSelect.value || undefined;
      this.story.status = statusSelect.value as Story["status"];
      this.story.priority = prioritySelect.value as Story["priority"];
      this.story.tags = tagsInput.value.split(/[,，]/).map(item => item.trim()).filter(Boolean);
      if (this.saveStory) this.saveStory(this.story);
      void this.plugin.commit(); this.close();
    };
    window.setTimeout(() => (controls.title as HTMLInputElement | undefined)?.select(), 0);
  }
  onClose(): void { this.contentEl.empty(); }
}

class StoryMapView extends ItemView {
  private selectedId: string | null = null;
  private query = "";
  private roleFilter = "";
  private inspectorOpen = true;
  constructor(leaf: WorkspaceLeaf, private plugin: StoryMapPlugin) { super(leaf); }
  getViewType(): string { return VIEW_TYPE; }
  getDisplayText(): string { return "故事地图"; }
  getIcon(): string { return "map"; }
  async onOpen(): Promise<void> { this.render(); }

  render(): void {
    const root = this.containerEl.children[1] as HTMLElement;
    const previousViewport = root.querySelector<HTMLElement>(".story-map-viewport");
    const scrollLeft = previousViewport?.scrollLeft || 0;
    const scrollTop = previousViewport?.scrollTop || 0;
    root.empty(); root.addClass("story-map-root");
    const data = this.plugin.data;
    const header = root.createDiv("story-map-header");
    const titleWrap = header.createDiv("story-map-title"); setIcon(titleWrap.createSpan(), "map");
    const title = titleWrap.createEl("input", { value: data.title, attr: { "aria-label": "地图名称" } });
    title.onchange = () => { data.title = title.value; void this.plugin.commit(false); };
    const toolbar = header.createDiv("story-map-toolbar");
    const search = toolbar.createEl("input", { type: "search", placeholder: "搜索 Story", value: this.query, cls: "story-map-search", attr: { "aria-label": "搜索故事" } });
    search.oninput = () => {
      this.query = search.value.trim().toLowerCase();
      this.applyCardFilters(root);
    };
    const roleFilter = toolbar.createEl("select", { cls: "story-map-role-filter", attr: { "aria-label": "按角色筛选" } });
    roleFilter.createEl("option", { value: "", text: "全部角色" });
    roleFilter.createEl("option", { value: "__none", text: "未分配角色" });
    this.plugin.data.roles.forEach(role => roleFilter.createEl("option", { value: role.id, text: role.name }));
    if (this.roleFilter && this.roleFilter !== "__none" && !this.plugin.data.roles.some(role => role.id === this.roleFilter)) this.roleFilter = "";
    roleFilter.value = this.roleFilter;
    roleFilter.onchange = () => { this.roleFilter = roleFilter.value; this.applyCardFilters(root); };
    this.iconButton(toolbar, "undo-2", "撤销", () => this.plugin.undo());
    this.iconButton(toolbar, "redo-2", "重做", () => this.plugin.redo());
    this.iconButton(toolbar, "users", "角色管理", () => new RoleManagerModal(this.plugin).open());
    this.iconButton(toolbar, "flag", "里程碑管理", () => new MilestoneManagerModal(this.plugin).open());
    this.iconButton(toolbar, "download", "导出 XMind", () => void this.plugin.exportXMind());
    toolbar.createSpan({ text: `${Math.round(data.zoom * 100)}%`, cls: "story-map-zoom-label" });
    this.iconButton(toolbar, "minus", "缩小", () => { data.zoom = Math.max(.6, data.zoom - .1); void this.plugin.commit(); });
    this.iconButton(toolbar, "plus", "放大", () => { data.zoom = Math.min(1.5, data.zoom + .1); void this.plugin.commit(); });
    this.iconButton(toolbar, "panel-right", "详情面板", () => { this.inspectorOpen = !this.inspectorOpen; this.render(); });

    const body = root.createDiv(`story-map-body${this.inspectorOpen ? " has-inspector" : ""}`);
    const viewport = body.createDiv("story-map-viewport");
    const canvas = viewport.createDiv("story-map-canvas"); canvas.style.setProperty("--story-map-zoom", String(data.zoom));
    this.renderCanvas(canvas);
    this.applyCardFilters(root);
    if (this.inspectorOpen) this.renderInspector(body);
    const status = root.createDiv("story-map-status");
    status.createSpan({ text: `${data.stories.length} 个故事 · ${data.activities.length} 个活动 · ${data.roles.length} 个角色` });
    status.createSpan({ text: this.plugin.saveStatus, cls: "story-map-save-status" });
    status.createEl("button", { text: "保存", attr: { "aria-label": "立即保存或重试保存" } }).onclick = () => void this.plugin.commit(false);
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
    activityRow.createDiv({ text: "活动 Activity", cls: "story-map-axis-label" });
    activities.forEach(activity => {
      const activityTasks = tasks.filter(t => t.activityId === activity.id);
      const box = activityRow.createDiv("story-map-activity"); box.id = `activity-${activity.id}`;
      box.style.gridColumn = `span ${Math.max(1, activityTasks.length)}`;
      const name = box.createSpan({ text: activity.title, cls: "story-map-activity-name", attr: { title: "双击改名" } });
      name.ondblclick = event => { event.stopPropagation(); this.renameActivity(activity); };
      box.oncontextmenu = e => this.activityMenu(e, activity);
    });
    const addActivity = activityRow.createEl("button", { text: "+ Activity", cls: "story-map-add-activity" }); addActivity.onclick = () => this.addActivity();
    const taskRow = canvas.createDiv("story-map-task-row");
    taskRow.createDiv({ text: "任务 Task", cls: "story-map-axis-label" });
    slots.forEach((task, index) => {
      const box = taskRow.createDiv("story-map-task");
      if (!task) {
        const activity = slotActivities[index];
        box.addClass("is-activity-start", "is-activity-end");
        box.createEl("button", { text: "+ Task" }).onclick = () => { if (activity) this.addTask(activity); };
        return;
      }
      const taskName = box.createSpan({ text: task.title, cls: "story-map-task-name", attr: { title: "双击改名" } }); taskName.ondblclick = event => { event.stopPropagation(); this.renameTask(task); };
      const siblings = tasks.filter(item => item.activityId === task.activityId);
      if (siblings[0]?.id === task.id) box.addClass("is-activity-start");
      const isLastTask = siblings[siblings.length - 1]?.id === task.id;
      if (isLastTask) {
        box.addClass("is-activity-end");
        const add = box.createEl("button", { text: "+ Task", cls: "story-map-add-task-after", attr: { "aria-label": `在${task.title}右侧添加 Task`, title: "追加 Task" } });
        add.onclick = event => { event.stopPropagation(); const activity = activities.find(item => item.id === task.activityId); if (activity) this.addTask(activity, task); };
      }
      box.oncontextmenu = e => this.taskMenu(e, task);
    });
    releases.forEach(release => this.renderRelease(canvas, release, slots, stories));
    const addMilestone = canvas.createDiv("story-map-add-milestone-row");
    const addMilestoneButton = addMilestone.createEl("button", { text: "+ Milestone", attr: { "aria-label": "添加或管理里程碑" } });
    addMilestoneButton.onclick = () => new NameModal(this.plugin, "添加里程碑", "里程碑名称", "新里程碑", title => {
      this.plugin.data.releases.push({ id: uid("milestone"), title, subtitle: "" });
    }).open();
  }

  private renderRelease(canvas: HTMLElement, release: Release, tasks: Array<Task | undefined>, stories: Story[]): void {
    const row = canvas.createDiv("story-map-release-row");
    const label = row.createDiv("story-map-release-label"); label.createEl("strong", { text: release.title }); label.createSpan({ text: release.subtitle });
    label.title = "双击管理里程碑"; label.ondblclick = () => new MilestoneManagerModal(this.plugin).open();
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
      const addStory = col.createEl("button", { text: "+ Story", cls: "story-map-add-story", attr: { "aria-label": `在${release.title}的${task.title}下添加 Story` } });
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
    const meta = card.createDiv("story-map-card-meta"); meta.createSpan({ text: story.status === "doing" ? "进行中" : story.status === "done" ? "已完成" : story.status === "planned" ? "已规划" : "想法" });
    meta.createSpan({ text: `${story.estimate} 点` });
    card.onclick = () => { this.selectedId = story.id; this.inspectorOpen = true; this.render(); };
    card.ondblclick = () => new StoryEditorModal(this.plugin, story).open();
    card.oncontextmenu = e => this.storyMenu(e, story);
  }

  private renderInspector(parent: HTMLElement): void {
    const panel = parent.createEl("aside", { cls: "story-map-inspector" });
    const story = this.plugin.data.stories.find(s => s.id === this.selectedId);
    const heading = panel.createDiv("story-map-panel-heading"); heading.createEl("strong", { text: "故事详情" });
    this.iconButton(heading, "x", "关闭详情", () => { this.inspectorOpen = false; this.render(); });
    if (!story) { panel.createDiv({ text: "选择一张故事卡查看详情", cls: "story-map-empty" }); return; }
    const title = panel.createEl("input", { value: story.title, cls: "story-map-inspector-title" }); title.onchange = () => { story.title = title.value; void this.plugin.commit(); };
    this.selectField(panel, "状态", story.status, [["idea", "想法"], ["planned", "已规划"], ["doing", "进行中"], ["done", "已完成"]], v => { story.status = v as Story["status"]; });
    this.selectField(panel, "优先级", story.priority, [["low", "低"], ["medium", "中"], ["high", "高"]], v => { story.priority = v as Story["priority"]; });
    const roleField = this.field(panel, "角色"); const roleChoices = roleField.createDiv("story-map-role-choices");
    const roleSelect = roleChoices.createEl("select", { attr: { "aria-label": "Story 所属角色" } }); roleSelect.createEl("option", { value: "", text: "未分配" });
    this.plugin.data.roles.forEach(role => roleSelect.createEl("option", { value: role.id, text: role.name })); roleSelect.value = story.roleId || "";
    roleSelect.onchange = () => { story.roleId = roleSelect.value || undefined; void this.plugin.commit(); };
    const manageRoles = roleChoices.createEl("button", { text: this.plugin.data.roles.length ? "管理角色" : "+ 添加角色", cls: "story-map-manage-roles", attr: { "aria-label": "添加、编辑或删除角色" } });
    manageRoles.onclick = () => new RoleManagerModal(this.plugin).open();
    const estimate = this.field(panel, "估点").createEl("input", { type: "number", value: String(story.estimate), attr: { min: "0" } });
    estimate.onchange = () => { story.estimate = Number(estimate.value); void this.plugin.commit(); };
    const tags = this.field(panel, "标签").createEl("input", { value: story.tags.join(", ") }); tags.onchange = () => { story.tags = tags.value.split(/[,，]/).map(x => x.trim()).filter(Boolean); void this.plugin.commit(); };
    const desc = this.field(panel, "描述").createEl("textarea"); desc.value = story.description; desc.onchange = () => { story.description = desc.value; void this.plugin.commit(); };
    const note = this.field(panel, "关联笔记").createEl("input", { value: story.notePath || "", placeholder: "故事/故事名称.md" }); note.onchange = () => { story.notePath = note.value || undefined; void this.plugin.commit(); };
    const actions = panel.createDiv("story-map-inspector-actions");
    const open = actions.createEl("button", { text: story.notePath ? "打开笔记" : "创建笔记" }); open.onclick = () => void this.plugin.openStoryNote(story);
    const edit = actions.createEl("button", { text: "编辑全部" }); edit.onclick = () => new StoryEditorModal(this.plugin, story).open();
  }

  private field(parent: HTMLElement, label: string): HTMLElement { const row = parent.createDiv("story-map-field"); row.createEl("label", { text: label }); return row; }
  private selectField(parent: HTMLElement, label: string, current: string, options: string[][], change: (value: string) => void): void {
    const select = this.field(parent, label).createEl("select"); options.forEach(([value, text]) => select.createEl("option", { value, text })); select.value = current;
    select.onchange = () => { change(select.value); void this.plugin.commit(); };
  }
  private addStory(task: Task, release?: Release): void {
    const story: Story = { id: uid("story"), title: "新用户故事", activityId: task.activityId, taskId: task.id, releaseId: release?.id || this.plugin.data.releases[0]?.id || "mvp", description: "", status: "idea", priority: "medium", estimate: 3, tags: [], color: "yellow" };
    new StoryEditorModal(this.plugin, story, savedStory => { this.plugin.data.stories.push(savedStory); this.selectedId = savedStory.id; this.inspectorOpen = true; }).open();
  }
  private addActivity(): void {
    new ActivityEditorModal(this.plugin, (activityName, taskName) => {
      const activity: Activity = { id: uid("activity"), title: activityName }; this.plugin.data.activities.push(activity);
      this.plugin.data.tasks.push({ id: uid("task"), title: taskName, activityId: activity.id });
    }).open();
  }
  private addTask(activity: Activity, afterTask?: Task): void {
    new NameModal(this.plugin, `在“${activity.title}”中添加 Task`, "Task 名称", "新任务", value => {
      const tasks = this.plugin.data.tasks;
      let insertAt = afterTask ? tasks.findIndex(task => task.id === afterTask.id) + 1 : -1;
      if (!afterTask) tasks.forEach((task, index) => { if (task.activityId === activity.id) insertAt = index + 1; });
      tasks.splice(insertAt < 0 ? tasks.length : insertAt, 0, { id: uid("task"), title: value, activityId: activity.id });
    }).open();
  }
  private renameActivity(activity: Activity): void { new NameModal(this.plugin, "修改 Activity", "Activity 名称", activity.title, value => { activity.title = value; }).open(); }
  private renameTask(task: Task): void { new NameModal(this.plugin, "修改 Task", "Task 名称", task.title, value => { task.title = value; }).open(); }
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
  private storyMenu(event: MouseEvent, story: Story): void { event.preventDefault(); const menu = new Menu(); menu.addItem(i => i.setTitle("编辑").setIcon("pencil").onClick(() => new StoryEditorModal(this.plugin, story).open())); menu.addItem(i => i.setTitle("打开关联笔记").setIcon("file-text").onClick(() => void this.plugin.openStoryNote(story))); menu.addSeparator(); menu.addItem(i => i.setTitle("删除").setIcon("trash").onClick(() => { this.plugin.data.stories.remove(story); this.selectedId = null; void this.plugin.commit(); })); menu.showAtMouseEvent(event); }
  private activityMenu(event: MouseEvent, activity: Activity): void {
    event.preventDefault(); const menu = new Menu();
    menu.addItem(i => i.setTitle("添加 Task").setIcon("plus").onClick(() => this.addTask(activity)));
    menu.addItem(i => i.setTitle("修改名称").setIcon("pencil").onClick(() => this.renameActivity(activity)));
    const taskCount = this.plugin.data.tasks.filter(task => task.activityId === activity.id).length;
    menu.addSeparator();
    menu.addItem(i => i.setTitle(taskCount ? `包含 ${taskCount} 个 Task，不能删除` : "删除 Activity").setIcon("trash").setDisabled(taskCount > 0).onClick(() => {
      if (this.plugin.data.tasks.some(task => task.activityId === activity.id)) { new Notice("这个 Activity 下面还有 Task，不能删除"); return; }
      this.plugin.data.activities.remove(activity); void this.plugin.commit();
    }));
    menu.showAtMouseEvent(event);
  }
  private taskMenu(event: MouseEvent, task: Task): void {
    event.preventDefault(); const activity = this.plugin.data.activities.find(item => item.id === task.activityId); const menu = new Menu();
    if (activity) menu.addItem(i => i.setTitle("在右侧添加 Task").setIcon("plus").onClick(() => this.addTask(activity, task)));
    menu.addItem(i => i.setTitle("修改名称").setIcon("pencil").onClick(() => this.renameTask(task)));
    const storyCount = this.plugin.data.stories.filter(story => story.taskId === task.id).length;
    menu.addSeparator();
    menu.addItem(i => i.setTitle(storyCount ? `包含 ${storyCount} 个 Story，不能删除` : "删除 Task").setIcon("trash").setDisabled(storyCount > 0).onClick(() => {
      if (this.plugin.data.stories.some(story => story.taskId === task.id)) { new Notice("这个 Task 下面还有 Story，不能删除"); return; }
      this.plugin.data.tasks.remove(task); void this.plugin.commit();
    }));
    menu.showAtMouseEvent(event);
  }
}

export default class StoryMapPlugin extends Plugin {
  data: StoryMapData = cloneDefault();
  private history: string[] = [];
  private future: string[] = [];
  private lastSerialized = JSON.stringify(this.data);
  saveStatus = "已载入 .story-map.json";
  private saveQueue: Promise<void> = Promise.resolve();
  private saveRevision = 0;
  private loadFailed = false;
  async onload(): Promise<void> {
    await this.loadMap();
    this.registerView(VIEW_TYPE, leaf => new StoryMapView(leaf, this));
    this.addRibbonIcon("map", "打开故事地图", () => void this.activateView());
    this.addCommand({ id: "open-story-map", name: "打开故事地图", callback: () => void this.activateView() });
    this.addCommand({ id: "reset-story-map", name: "重置为示例地图", callback: () => { this.snapshot(); this.data = cloneDefault(); void this.commit(false); } });
  }
  onunload(): void { this.app.workspace.detachLeavesOfType(VIEW_TYPE); }
  async activateView(): Promise<void> { let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]; if (!leaf) { leaf = this.app.workspace.getLeaf("tab"); await leaf.setViewState({ type: VIEW_TYPE, active: true }); } this.app.workspace.revealLeaf(leaf); }
  private async loadMap(): Promise<void> {
    try {
      if (await this.app.vault.adapter.exists(DATA_PATH)) this.data = JSON.parse(await this.app.vault.adapter.read(DATA_PATH)) as StoryMapData;
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
      new Notice("故事地图读取失败，已停止保存。请修复 .story-map.json 后重新加载插件。", 10000);
    }
    this.lastSerialized = JSON.stringify(this.data);
  }
  private snapshot(): void { this.history.push(this.lastSerialized); if (this.history.length > 50) this.history.shift(); this.future = []; }
  async commit(track = true): Promise<void> {
    if (this.loadFailed) { new Notice(this.saveStatus); return; }
    if (track) this.snapshot();
    this.lastSerialized = JSON.stringify(this.data);
    const payload = JSON.stringify(this.data, null, 2);
    const revision = ++this.saveRevision;
    this.saveStatus = "正在保存…";
    this.refresh();
    this.saveQueue = this.saveQueue.then(async () => {
      try {
        await this.app.vault.adapter.write(DATA_PATH, payload);
        if (revision === this.saveRevision) this.saveStatus = "已保存到 .story-map.json";
      } catch {
        if (revision === this.saveRevision) this.saveStatus = "保存失败，修改仍在内存中；请重试";
        new Notice("故事地图保存失败，请检查磁盘和文件权限。修改仍在内存中，请勿关闭插件。", 10000);
      }
      this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach(leaf => {
        const status = leaf.view.containerEl.querySelector(".story-map-save-status");
        if (status) status.textContent = this.saveStatus;
      });
    });
    await this.saveQueue;
  }
  undo(): void { const previous = this.history.pop(); if (!previous) return; this.future.push(JSON.stringify(this.data)); this.data = JSON.parse(previous) as StoryMapData; void this.commit(false); }
  redo(): void { const next = this.future.pop(); if (!next) return; this.history.push(JSON.stringify(this.data)); this.data = JSON.parse(next) as StoryMapData; void this.commit(false); }
  private refresh(): void { this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach(leaf => { const view = leaf.view; if (view instanceof StoryMapView) view.render(); }); }
  async exportXMind(): Promise<void> {
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
      const details = [story.description, `里程碑：${release?.title || "未分配"}`, includeLocation && activity ? `Activity：${activity.title}` : "", includeLocation && taskItem ? `Task：${taskItem.title}` : "", `状态：${story.status}`, `优先级：${story.priority}`, `估点：${story.estimate}`, story.tags.length ? `标签：${story.tags.join("、")}` : "", roles.length ? `角色：${roles.join("、")}` : ""].filter(Boolean).join("\n");
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
    const rootChildren = [topic("用户旅程", activityTopics), topic("发布计划", releaseTopics)];
    if (roleTopics.length) rootChildren.push(topic("角色", roleTopics));
    const sheetId = uid("sheet");
    const content = [{ id: sheetId, class: "sheet", title: this.data.title, rootTopic: { ...topic(this.data.title, rootChildren), structureClass: "org.xmind.ui.logic.right" }, topicOverlapping: "overlap" }];
    const metadata = { dataStructureVersion: "3", creator: { name: "Obsidian Story Map", version: PLUGIN_VERSION }, layoutEngineVersion: "5", activeSheetId: sheetId };
    const manifest = { "file-entries": { "content.json": {}, "metadata.json": {} } };
    const zip = new JSZip();
    zip.file("content.json", JSON.stringify(content)); zip.file("metadata.json", JSON.stringify(metadata)); zip.file("manifest.json", JSON.stringify(manifest));
    const output = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
    const folder = "故事地图导出"; if (!(await this.app.vault.adapter.exists(folder))) await this.app.vault.createFolder(folder);
    const safeTitle = this.data.title.replace(/[\\/:*?"<>|]/g, "-").trim() || "用户故事地图";
    let path = normalizePath(`${folder}/${safeTitle}.xmind`); let sequence = 2;
    while (await this.app.vault.adapter.exists(path)) { path = normalizePath(`${folder}/${safeTitle}-${sequence}.xmind`); sequence += 1; }
    await this.app.vault.adapter.writeBinary(path, output);
    new Notice(`已导出 XMind：${path}`, 6000);
  }
  async openStoryNote(story: Story): Promise<void> {
    const path = normalizePath(story.notePath || `故事/${story.title}.md`); story.notePath = path;
    let file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      const folder = path.split("/").slice(0, -1).join("/"); if (folder && !(await this.app.vault.adapter.exists(folder))) await this.app.vault.createFolder(folder);
      file = await this.app.vault.create(path, `---\nstatus: ${story.status}\npriority: ${story.priority}\nestimate: ${story.estimate}\ntags: [${story.tags.join(", ")}]\n---\n\n# ${story.title}\n\n${story.description}\n\n## 验收标准\n\n- [ ] \n`);
      await this.commit(false);
    }
    await this.app.workspace.getLeaf("tab").openFile(file as TFile);
  }
}
