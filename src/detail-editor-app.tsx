import { useEffect, useRef, useState } from 'react';
import { Alert, Button, ConfigProvider, Dropdown, Input, Tooltip, theme } from 'antd';
import { CheckOutlined, CloseOutlined, FileOutlined, FolderOpenOutlined, PaperClipOutlined, PlusOutlined } from '@ant-design/icons';
import { FuzzySuggestModal, TFile, type App } from 'obsidian';
import type { Activity, Task, TaskAttachment, TaskColor } from './types';
import { taskT } from './editor-labels';
import { isTaskColor, taskColors } from './task-colors';
import { renameTaskFiles, taskImage } from './task-content';
import { RichTextEditor, type RichTextHandle } from './rich-text-editor';

class AttachmentPicker extends FuzzySuggestModal<TFile> {
  constructor(app: App, private choose: (file: TFile) => void) { super(app); }
  getItems(): TFile[] { return this.app.vault.getFiles(); }
  getItemText(file: TFile): string { return file.path; }
  onChooseItem(file: TFile): void { this.choose(file); }
}
export interface DetailDraft { title: string; description: string; attachments: TaskAttachment[]; color?: TaskColor; }
export interface DetailEditorProps {
  app: App; sourcePath: string; entity: Task | Activity; kind: 'task' | 'activity'; creating: boolean; context?: string;
  onSave(draft: DetailDraft): Promise<boolean>; onClose(): void; onBusy(busy: boolean): void;
}
export function DetailEditorApp(props: DetailEditorProps) {
  const root = useRef<HTMLDivElement>(null);
  const rich = useRef<RichTextHandle>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(props.entity.title);
  const description = useRef(props.entity.description || '');
  const [attachments, setAttachments] = useState<TaskAttachment[]>((props.entity.attachments || []).map(item => ({ ...item })));
  const attachmentsRef = useRef(attachments); attachmentsRef.current = attachments;
  const [color, setColor] = useState<TaskColor | undefined>('color' in props.entity && isTaskColor(props.entity.color) ? props.entity.color : undefined);
  const [dirty, setDirty] = useState(props.creating);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [dark, setDark] = useState(false);
  const alive = useRef(true);
  const importQueue = useRef<File[]>([]);
  useEffect(() => {
    alive.current = true;
    const body = root.current?.ownerDocument.body;
    const update = () => setDark(body?.classList.contains('theme-dark') || false);
    update();
    const observer = new MutationObserver(update);
    if (body) observer.observe(body, { attributes: true, attributeFilter: ['class'] });
    const event = props.app.vault.on('rename', (file, oldPath) => {
      const draft = { ...props.entity, description: rich.current?.getMarkdown() || description.current, attachments: attachmentsRef.current.map(item => ({ ...item })) };
      if (renameTaskFiles(draft, oldPath, file.path)) {
        description.current = draft.description; rich.current?.setMarkdown(draft.description);
        setAttachments(draft.attachments); setDirty(true);
      }
    });
    return () => { alive.current = false; observer.disconnect(); props.app.vault.offref(event); };
  }, []);
  const working = (value: boolean) => { busyRef.current = value; setBusy(value); props.onBusy(value); };
  const fail = (cause: unknown) => { if (alive.current) setError(`${taskT('操作失败，请重试')}: ${cause instanceof Error ? cause.message : String(cause)}`); };
  const attach = (file: TFile, insert = false) => {
    if (!alive.current) return;
    setAttachments(items => items.some(item => item.path === file.path) ? items : [...items, { path: file.path, kind: 'reference' }]);
    if (insert) rich.current?.insertFile(file, true);
    setDirty(true);
  };
  const importFiles = async (files: File[]) => {
    if (busyRef.current || !files.length) return;
    working(true); setError(''); importQueue.current = [...files];
    try {
      for (const file of files) {
        const path = await props.app.fileManager.getAvailablePathForAttachment(file.name || 'pasted-image.png', props.sourcePath);
        const imported = await props.app.vault.createBinary(path, await file.arrayBuffer());
        attach(imported, true);
      }
    } catch (cause) { fail(cause); }
    finally { importQueue.current = []; if (alive.current) working(false); }
  };
  const submit = async () => {
    if (busyRef.current || !title.trim()) return;
    working(true); setError('');
    try {
      const saved = await props.onSave({ title: title.trim(), description: rich.current?.getMarkdown() ?? description.current, attachments: attachments.map(item => ({ ...item })), color });
      if (saved) { working(false); props.onClose(); }
      else setError(taskT('保存失败，请重试'));
    } catch (cause) { fail(cause); }
    finally { if (alive.current && busyRef.current) working(false); }
  };
  const kindName = taskT(props.kind === 'task' ? '任务' : '活动');
  const heading = taskT(props.kind === 'task' ? props.creating ? '添加任务' : '任务详情' : props.creating ? '添加活动' : '活动详情');
  return <ConfigProvider prefixCls="sm-ant" componentSize="small" theme={{ algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#8b6cef', fontSize: 13, borderRadius: 6, controlHeight: 30, controlHeightSM: 28, fontFamily: 'var(--font-interface)', colorBgContainer: dark ? '#242426' : '#ffffff', colorBgElevated: dark ? '#29292c' : '#ffffff' } }} getPopupContainer={trigger => root.current || trigger?.ownerDocument.body || document.body}>
    <div ref={root} className="sm-detail-root" onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); } }}>
      <header className="sm-detail-header"><div><span className="sm-detail-kind">{kindName}</span><h2>{heading}</h2>{props.context && <p>{props.context}</p>}</div><Button type="text" aria-label={taskT('关闭')} icon={<CloseOutlined />} disabled={busy} onClick={() => props.onClose()} /></header>
      <main className="sm-detail-body">
        <label className="sm-detail-label" htmlFor="sm-detail-name">{taskT(props.kind === 'task' ? '任务名称' : '活动名称')}</label>
        <Input autoFocus id="sm-detail-name" className="sm-detail-title-input" aria-label={taskT(props.kind === 'task' ? '任务名称' : '活动名称')} placeholder={taskT('输入名称')} value={title} disabled={busy} onChange={event => { setTitle(event.target.value); setDirty(true); }} />
        {props.kind === 'task' && <div className="sm-detail-color-row"><span>{taskT('任务颜色')}</span><div role="group" aria-label={taskT('任务颜色')} className="sm-detail-colors">{[undefined, ...Object.keys(taskColors) as TaskColor[]].map(value => {
          const label = taskT(value ? taskColors[value].label : '跟随主题');
          return <Tooltip key={value || 'theme'} title={label}><Button className={`sm-detail-swatch ${value ? `story-map-task-tone-${value}` : 'sm-swatch-theme'}`} aria-label={label} aria-pressed={color === value} disabled={busy} icon={color === value ? <CheckOutlined /> : undefined} onClick={() => { setColor(value); setDirty(true); }} /></Tooltip>;
        })}</div></div>}
        <div className="sm-detail-section-heading"><label className="sm-detail-label">{taskT('描述')}</label></div>
        <RichTextEditor ref={rich} app={props.app} sourcePath={props.sourcePath} initial={props.entity.description || ''} disabled={busy} onChange={value => { description.current = value; setDirty(true); }} onFiles={files => { void importFiles(files); }} onImage={() => { if (fileInput.current) { fileInput.current.accept = 'image/*'; fileInput.current.click(); } }} />
        <section className="sm-detail-attachment-section">
          <input className="story-map-hidden" ref={fileInput} type="file" multiple onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void importFiles(files); }} />
          <div className="sm-detail-attachment-strip">{attachments.map(attachment => {
            const file = props.app.vault.getAbstractFileByPath(attachment.path);
            const exists = file instanceof TFile;
            const name = attachment.path.split('/').pop() || attachment.path;
            return <div className={`sm-detail-attachment ${exists && taskImage(file.path) ? 'is-image' : ''}`} key={attachment.path}>
              <button className="sm-detail-attachment-open" title={attachment.path} aria-label={`${taskT('打开文件')}: ${name}`} disabled={busy || !exists} onClick={() => { if (exists) void props.app.workspace.getLeaf('tab').openFile(file).catch(fail); }}>
                {exists && taskImage(file.path) ? <img src={props.app.vault.getResourcePath(file)} alt={name} /> : <><FileOutlined /><span>{name}</span></>}
                {!exists && <small>{taskT('文件不存在')}</small>}
              </button>
              <Button className="sm-detail-attachment-remove" type="text" aria-label={`${taskT('移除附件关联')}: ${name}`} icon={<CloseOutlined />} disabled={busy} onClick={() => { setAttachments(items => items.filter(item => item.path !== attachment.path)); setDirty(true); }} />
            </div>;
          })}
          <Dropdown trigger={['click']} menu={{ items: [{ key: 'upload', label: taskT('添加附件'), icon: <PaperClipOutlined /> }, { key: 'vault', label: taskT('库内文件'), icon: <FolderOpenOutlined /> }], onClick: ({ key }) => {
            if (key === 'vault') new AttachmentPicker(props.app, file => { if (!busyRef.current) attach(file); }).open();
            else if (fileInput.current) { fileInput.current.accept = ''; fileInput.current.click(); }
          } }}><Button className="sm-detail-attachment-add" aria-label={taskT('添加附件')} icon={<PlusOutlined />} disabled={busy} /></Dropdown>
          </div>
        </section>
      </main>
      <footer className="sm-detail-footer">{error && <Alert className="sm-detail-error" type="error" message={error} showIcon />}<div className="sm-detail-footer-line"><span className="sm-detail-save-state" role="status">{busy ? taskT(importQueue.current.length ? '正在导入…' : '正在保存…') : taskT(dirty ? '未保存' : '已保存')}</span><span className="sm-detail-shortcut">⌘ / Ctrl ↵</span><Button disabled={busy} onClick={() => props.onClose()}>{taskT('取消')}</Button><Button type="primary" loading={busy} disabled={!title.trim()} onClick={() => { void submit(); }}>{taskT('保存')}</Button></div></footer>
    </div>
  </ConfigProvider>;
}
