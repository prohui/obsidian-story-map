# Obsidian Story Map

English · [简体中文](README.zh-CN.md)

Plan user journeys, organize stories, and define release milestones inside Obsidian. Keep your map in your vault, link stories to Markdown notes, and export to XMind.

**[Download 1.4.0](https://github.com/prohui/obsidian-story-map/releases/tag/1.4.0)** · [Report an issue](https://github.com/prohui/obsidian-story-map/issues) · [MIT License](LICENSE)

### New in 1.4.0

Right-click a folder → New story map, then choose a starter template or sample. Each map is an independent `.storymap` file containing JSON; legacy maps remain supported. Create activities, tasks, stories and milestones through dialogs. Click a milestone to edit it; milestones containing stories cannot be deleted. Search, select and unlink existing notes.

![Story Map running in Obsidian with activities, tasks, milestone lanes, role labels, and the story details panel](docs/images/obsidian-en.png)

*Captured in Obsidian 1.13.7 using sample data. New sample content follows the selected language; existing maps stay unchanged.*

## Features

- Activity → Task → Story hierarchy with task columns and milestone lanes.
- Add activities/tasks at the end of their groups; add stories below existing cards. Double-click to edit.
- Create, edit, or delete roles. Each story can have one role or remain unassigned.
- Manage milestones. Milestones containing stories cannot be deleted; empty tasks and activities can be deleted from the context menu.
- Drag stories between tasks and milestones or before another card to reorder them.
- Floating details: status, priority, estimate, tags, description, and linked Markdown notes.
- Search, role filters, zoom, undo/redo, and preserved scroll position.
- Eight interface languages: English, Simplified Chinese, Traditional Chinese, Japanese, Korean, German, French, and Spanish. Follow Obsidian automatically or choose manually.
- Export dialog with PNG, PDF, XMind and JSON formats. XMind includes User journey, Release plan and Roles branches, with story details in topic notes.
- Local saving with status, retry, and protection against overwriting unreadable data.

## Install

Requires Obsidian 1.8.10 or newer.

1. Download `main.js`, `manifest.json`, and `styles.css` individually from [Releases](https://github.com/prohui/obsidian-story-map/releases/latest).
2. Create `.obsidian/plugins/story-map/` in your vault and place the three files there.
3. Enable Story Map in Obsidian's community plugin settings.
4. Click the map ribbon icon or run the Open Story Map command.

To update, replace the files and disable/re-enable the plugin. Map data is stored outside the plugin folder. Visit the [Obsidian community listing](https://community.obsidian.md/plugins/story-map) for the current review status and installation entry point.

## Use and language

Name the map, add activities, break them into tasks, and add stories within milestone lanes. Click a story to edit details or link a note. Manage roles and assign one to each story as needed. Drag cards to change their ordering or release scope.

The toolbar language selector supports Follow Obsidian and all eight languages. Changes take effect immediately and persist across reloads. Unsupported host languages fall back to English; Traditional Chinese locales are detected separately. New and explicitly reset sample maps use the current language. Changing the interface language never translates or overwrites an existing map.

Click the export arrow to choose a format, then confirm. PNG is a full-map image; PDF embeds that image on one page (text is not searchable); XMind is an editable mind map; JSON is a complete data backup (no import interface yet). PNG/PDF use a clean light layout showing all activities, tasks, milestones and story cards, without controls or the inspector. Search, filters and zoom never limit the exported data. Very large maps exceeding the visual export safety limit must use XMind or JSON.

Choose a format card, then use the system Save As dialog to choose the filename and location, including folders outside your vault. Only the selected file is written; cancelling does not export. The system handles overwrite confirmation and remembers the directory. The last successfully exported format is remembered. If the system picker is unavailable, files go to a localized vault folder such as `Story Map Exports/`, with numbered filenames to preserve existing files. Export labels follow the interface language; story content stays unchanged. Errors appear in the dialog and can be retried.

## Data and compatibility

- One map per vault, stored in `.story-map.json` at the vault root. Include it in backups.
- The plugin makes no network requests. Linked Markdown notes remain readable without it.
- Undo history lasts for the current session, up to 50 steps. Sync before editing on another device; simultaneous editing conflict resolution is not provided.
- If saving fails, keep the plugin open, resolve disk/permission problems, and click Save. If loading fails, repair the map file and reload the plugin.
- Release acceptance: macOS, Obsidian 1.8.10, XMind 26.04.01337. Desktop/narrow layouts, both languages, core editing flows, persistence, and opening exports were checked. Saving and reopening in XMind were also tested.

## Development

With Node.js 22:

```sh
npm ci
npm test
```

Tests include official Obsidian lint rules, TypeScript checks, production bundling, persistence regression tests, localization, and XMind structure checks. `npm run lint` runs the guidelines check separately. `npm run dev` watches for changes. Copy the built plugin files into a test vault to run it.

Translations are centralized in `src/i18n.ts`. User values are interpolated without modification. Contributions and additional translations are welcome. Include your Obsidian version, reproduction steps, and a non-private example when reporting an issue.

## License

[MIT](LICENSE) © 2026 Dahui. Not affiliated with Obsidian, Miro, or XMind.
