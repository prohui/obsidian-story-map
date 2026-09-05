# Obsidian 故事地图

一个本地优先的用户故事地图编辑器。它把活动、任务、用户故事和发布泳道放进可拖拽的画布，同时让故事卡可以关联普通 Markdown 笔记。

Local-first user story mapping for Obsidian: Activity → Task → Story, milestone lanes, one role per story, and XMind export.

当前版本为 **0.8.6 预览版**。已验证构建、保存队列、保存失败重试、旧数据保护、撤销重做和 XMind 文件结构；Obsidian 内完整交互、移动端和 XMind 客户端兼容性尚未完成实机验收。

## 当前能力

- 标准 Activity → Task → Story 三级结构
- 地图级角色管理，每个 Story 可分配一个角色
- 顶部可按角色筛选 Story，包括未分配角色
- 里程碑可新增、编辑和删除；包含 Story 时禁止删除
- 一键导出原生 `.xmind` 脑图文件，以“用户旅程 / 发布计划 / 角色”三个分支呈现完整信息
- Activity 跨列分组，Task 作为列，同一 Task 的 Story 纵向堆叠
- Activity 行末直接添加 Activity；每个 Activity 内直接添加 Task
- 新建时立即命名，双击 Activity 或 Task 标题可改名
- 移除重复的固定地图大纲，搜索移入顶部工具栏
- Activity 只从整行末尾增加；每个 Activity 的最后一个 Task 右侧固定显示 `+ Task`，用于继续追加
- 每个 Task × Milestone 单元格底部都可直接增加 Story
- 拖动 Story 到另一张卡片前，可调整任务内优先顺序
- MVP、版本 1、以后发布泳道
- 拖拽故事卡改变任务和发布版本
- 新增、编辑、删除故事；新增活动和任务，空 Activity/Task 可删除
- 状态、优先级、估点、标签、描述和关联笔记
- 创建或打开故事 Markdown 笔记
- 搜索、实际缩放画布、撤销和重做
- 自动保存为 Vault 根目录下的 `.story-map.json`
- 适配 Obsidian 明暗主题与窄屏布局

## 安装

1. 从 [GitHub Releases](https://github.com/prohui/obsidian-story-map/releases) 下载 `main.js`、`manifest.json` 和 `styles.css`，或下载 ZIP 后解压。
2. 在 Vault 中创建 `.obsidian/plugins/story-map/`，将上述三个文件放入该目录。
3. 在 Obsidian → 设置 → 第三方插件中启用“故事地图”。
4. 点击左侧地图图标，或执行命令“故事地图：打开故事地图”。

更新时替换这三个文件，再禁用并重新启用插件。当前采用手动安装，尚未收录到 Obsidian 社区插件目录。

## 开发与验证

使用 Node.js 22：

```sh
npm ci
npm test
```

`npm test` 会执行 TypeScript 检查、生产构建和回归测试。`npm run dev` 启动构建监听。开发者可以将构建后的三个插件文件复制到测试 Vault 中验证。

欢迎通过 [Issues](https://github.com/prohui/obsidian-story-map/issues) 报告问题或提交 Pull Request。请附上 Obsidian 版本、操作步骤及不含私人数据的示例。

## 数据安全

插件不会联网。地图数据保存在 Vault 内，可随 Vault 一同备份或通过 Git 管理。故事的 Markdown 文件也是普通文件，停用插件后仍可读取。

每个 Vault 当前只有一张地图。保存状态显示在底部；保存失败时修改仍在内存中，可点击“保存”重试。读取失败时暂停写入，修复文件后重新加载插件。撤销历史只保留在当前会话内，最多 50 步；插件未实现多端同时编辑冲突合并。

## 0.8.6

- 移除根据旧示例名称自动覆盖地图的行为。
- 重绘后保留画布滚动位置。
- 空 Activity 保留对齐占位及添加 Task 的入口。
- 保存串行执行，显示保存状态并提供重试入口。
- 底部 `+ Milestone` 直接新增里程碑。

## License

[MIT](LICENSE) © 2026 Dahui. 本项目与 Obsidian、Miro、XMind 无隶属关系。
