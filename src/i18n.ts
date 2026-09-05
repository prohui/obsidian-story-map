import { dictionaries, type ExtraLocale } from "./locales";
export type Locale = "zh" | "en" | ExtraLocale;
export type Language = "auto" | Locale;
export const languageNames: Record<Locale, string> = { en: "English", zh: "简体中文", "zh-TW": "繁體中文", ja: "日本語", ko: "한국어", de: "Deutsch", fr: "Français", es: "Español" };
let locale: Locale = "en";
export function isLanguage(value: unknown): value is Language { return typeof value === "string" && (value === "auto" || Object.keys(languageNames).includes(value)); }
export function getLocale(): Locale { return locale; }

export function setLocale(language: Language, hostLanguage = "en"): void {
  const value = (language === "auto" ? hostLanguage : language).toLowerCase().replace(/_/g, "-");
  if (value === "zh-tw" || value.startsWith("zh-hant") || value === "zh-hk" || value === "zh-mo") locale = "zh-TW";
  else if (value === "zh" || value.startsWith("zh-")) locale = "zh";
  else {
    const base = value.split("-")[0];
    locale = isLanguage(base) && base !== "auto" ? base : "en";
  }
}

export const english: Record<string, string> = {
  "导出": "Export", "导出地图": "Export map", "导出格式": "Export format", "正在导出…": "Exporting…", "已导出：{0}": "Exported: {0}", "导出失败：{0}": "Export failed: {0}",
  "PNG：完整地图图片，适合分享和插入文档。": "PNG: Full-map image for sharing and inserting into documents.",
  "PDF：单页地图图片，适合分享和打印，文字不可搜索。": "PDF: Single-page map image for sharing and printing. Text is not searchable.",
  "XMind：可继续编辑的脑图，包含用户旅程、里程碑和角色。": "XMind: Editable mind map with the user journey, milestones and roles.",
  "JSON：完整地图数据备份；暂不提供导入界面。": "JSON: Complete map data backup. An import interface is not yet available.",
  "导出完整地图，不受搜索、筛选或缩放影响。": "Exports the complete map, regardless of search, filters or zoom.",
  "保存到库内文件夹：{0}，同名文件自动编号。": "Saved to vault folder: {0}. Existing files are preserved by numbering new files.",
  "无法创建导出画布": "Could not create the export canvas", "地图过大，请选择 XMind 或 JSON 导出": "Map too large. Please export as XMind or JSON.", "图像生成失败": "Image generation failed", "不支持的导出格式": "Unsupported export format",
  "故事": "Story", "想法": "Idea", "已规划": "Planned", "进行中": "In progress", "已完成": "Done",
  "低": "Low", "中": "Medium", "高": "High", "取消": "Cancel", "保存": "Save",
  "添加 Activity": "Add Activity", "Activity 名称": "Activity name", "例如：进入系统": "e.g. Access the system",
  "第一个 Task": "First Task", "例如：注册账号": "e.g. Create an account", "创建": "Create",
  "角色管理": "Manage roles", "角色属于整张地图，可分配给任意用户故事。": "Roles belong to the map. Each story can have one role.",
  "角色名称": "Role name", "角色说明": "Role description", "删除": "Delete", "删除角色 {0}": "Delete role {0}",
  "未命名角色": "Untitled role", "还没有角色": "No roles yet", "+ 角色": "+ Role", "新角色": "New role", "完成": "Done",
  "里程碑管理": "Manage milestones", "里程碑决定 Story 所在的横向发布切片。包含 Story 的里程碑不能删除。": "Milestones organize stories into horizontal release lanes. A milestone with stories cannot be deleted.",
  "里程碑名称": "Milestone name", "说明": "Description", "里程碑说明": "Milestone description",
  "该里程碑包含 {0} 个 Story，不能删除": "This milestone has {0} stories and cannot be deleted",
  "删除里程碑 {0}": "Delete milestone {0}", "请先将 Story 移动到其他里程碑": "Move the stories to another milestone first",
  "删除里程碑": "Delete milestone", "未命名里程碑": "Untitled milestone",
  "这个里程碑下面还有 Story，不能删除": "This milestone contains stories and cannot be deleted",
  "还没有里程碑": "No milestones yet", "+ 里程碑": "+ Milestone", "新里程碑": "New milestone",
  "添加故事": "Add story", "编辑故事": "Edit story", "故事标题": "Story title", "故事描述": "Story description",
  "估点": "Estimate", "关联笔记": "Linked note", "角色": "Roles", "未分配角色": "Unassigned role",
  "状态": "Status", "优先级": "Priority", "标签": "Tags", "用逗号分隔": "Separate with commas", "未命名故事": "Untitled story",
  "故事地图": "Story Map", "地图名称": "Map name", "搜索 Story": "Search stories", "搜索故事": "Search stories",
  "按角色筛选": "Filter by role", "全部角色": "All roles", "撤销": "Undo", "重做": "Redo", "导出 XMind": "Export XMind",
  "缩小": "Zoom out", "放大": "Zoom in", "详情面板": "Details panel",
  "{0} 个故事 · {1} 个活动 · {2} 个角色": "{0} stories · {1} activities · {2} roles",
  "立即保存或重试保存": "Save now or retry", "活动 Activity": "Activity", "双击改名": "Double-click to rename",
  "任务 Task": "Task", "在{0}右侧添加 Task": "Add Task after {0}", "追加 Task": "Append Task",
  "添加或管理里程碑": "Add milestone", "添加里程碑": "Add milestone", "双击管理里程碑": "Double-click to manage milestones",
  "在{0}的{1}下添加 Story": "Add Story to {1} in {0}", "{0} 点": "{0} pts", "故事详情": "Story details",
  "关闭详情": "Close details", "选择一张故事卡查看详情": "Select a story to view its details", "Story 所属角色": "Story role",
  "未分配": "Unassigned", "管理角色": "Manage roles", "+ 添加角色": "+ Add role", "添加、编辑或删除角色": "Add, edit or delete roles",
  "描述": "Description", "故事/故事名称.md": "Stories/Story title.md", "打开笔记": "Open note", "创建笔记": "Create note",
  "编辑全部": "Edit all", "新用户故事": "New user story", "在“{0}”中添加 Task": "Add Task to “{0}”",
  "Task 名称": "Task name", "新任务": "New task", "修改 Activity": "Edit Activity", "修改 Task": "Edit Task",
  "编辑": "Edit", "打开关联笔记": "Open linked note", "添加 Task": "Add Task", "修改名称": "Rename",
  "包含 {0} 个 Task，不能删除": "Contains {0} tasks; cannot delete", "删除 Activity": "Delete Activity",
  "这个 Activity 下面还有 Task，不能删除": "This activity contains tasks and cannot be deleted",
  "在右侧添加 Task": "Add Task to the right", "包含 {0} 个 Story，不能删除": "Contains {0} stories; cannot delete",
  "删除 Task": "Delete Task", "这个 Task 下面还有 Story，不能删除": "This task contains stories and cannot be deleted",
  "已载入 .story-map.json": "Loaded .story-map.json", "打开故事地图": "Open Story Map", "重置为示例地图": "Reset to sample map",
  "读取失败，已停止保存以保护原文件": "Load failed; saving is paused to protect the original file",
  "故事地图读取失败，已停止保存。请修复 .story-map.json 后重新加载插件。": "Story Map could not load the file. Saving is paused. Repair .story-map.json and reload the plugin.",
  "正在保存…": "Saving…", "已保存到 .story-map.json": "Saved to .story-map.json",
  "保存失败，修改仍在内存中；请重试": "Save failed; edits remain in memory. Please retry.",
  "故事地图保存失败，请检查磁盘和文件权限。修改仍在内存中，请勿关闭插件。": "Story Map could not save. Check disk space and file permissions. Your edits remain in memory; keep the plugin open.",
  "里程碑：{0}": "Milestone: {0}", "活动：{0}": "Activity: {0}", "任务：{0}": "Task: {0}", "状态：{0}": "Status: {0}",
  "优先级：{0}": "Priority: {0}", "估点：{0}": "Estimate: {0}", "标签：{0}": "Tags: {0}", "角色：{0}": "Role: {0}",
  "关联笔记：{0}": "Linked note: {0}", "用户旅程": "User journey", "发布计划": "Release plan", "故事地图导出": "Story Map Exports",
  "用户故事地图": "User Story Map", "已导出 XMind：{0}": "XMind exported: {0}", "故事/{0}.md": "Stories/{0}.md",
  "语言": "Language", "跟随 Obsidian": "Follow Obsidian", "语言设置保存失败": "Could not save language preference", "验收标准": "Acceptance criteria",
};

export function t(key: string, ...values: Array<string | number>): string {
  const template = locale === "zh" ? key : locale === "en" ? english[key] ?? key : dictionaries[locale][key] ?? english[key] ?? key;
  return template.replace(/\{(\d+)\}/g, (token, index) => values[Number(index)] === undefined ? token : String(values[Number(index)]));
}
