import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { Button, Input, Popover, Space, Tooltip } from 'antd';
import { BoldOutlined, ItalicOutlined, UnorderedListOutlined, CheckSquareOutlined, LinkOutlined, PictureOutlined, } from '@ant-design/icons';
import { Editor, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { Markdown } from '@tiptap/markdown';
import { TFile, type App } from 'obsidian';
import { allowedLink, toEditorMarkdown, fromEditorMarkdown, vaultLink, vaultPath } from './rich-content';
import { taskImage } from './task-content';
import { taskT } from './editor-labels';

export interface RichTextHandle {
  getMarkdown(): string;
  setMarkdown(markdown: string): void;
  insertFile(file: TFile, append?: boolean): void;
}
interface Props {
  app: App; sourcePath: string; initial: string; disabled: boolean;
  onChange(markdown: string): void; onFiles(files: File[]): void; onImage(): void;
}

export const RichTextEditor = forwardRef<RichTextHandle, Props>((props, ref) => {
  const mount = useRef<HTMLDivElement>(null);
  const instance = useRef<Editor>();
  const callbacks = useRef(props); callbacks.current = props;
  const markdown = useRef(props.initial);
  const [, refresh] = useState(0);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState(false);
  const resolveImage = (source: unknown): string => {
    if (typeof source !== 'string') return '';
    if (/^https?:\/\//i.test(source)) return source;
    let path = vaultPath(source);
    if (path === undefined && !/^[a-z][a-z\d+.-]*:|^\/\//i.test(source)) {
      try { path = decodeURIComponent(source); } catch { return ''; }
    }
    if (path !== undefined) {
      const file = props.app.vault.getAbstractFileByPath(path) || props.app.metadataCache.getFirstLinkpathDest(path, props.sourcePath);
      return file instanceof TFile ? props.app.vault.getResourcePath(file) : '';
    }
    return '';
  };
  useEffect(() => {
    if (!mount.current) return;
    const VaultImage = Image.extend({
      renderHTML({ HTMLAttributes }) { return ['img', mergeAttributes(HTMLAttributes, { src: resolveImage(HTMLAttributes.src) })]; },
      addNodeView() {
        return ({ node }) => {
          const image = createEl('img');
          const src = resolveImage(node.attrs.src);
          if (src) image.src = src;
          image.alt = typeof node.attrs.alt === 'string' ? node.attrs.alt : taskT('图片');
          image.title = vaultPath(String(node.attrs.src)) || image.alt;
          image.classList.add('sm-rich-image');
          return { dom: image };
        };
      },
    });
    const editor = new Editor({
      element: mount.current,
      extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, protocols: ['storymap-vault'], isAllowedUri: url => !!allowedLink(url) } }), VaultImage, TaskList, TaskItem.configure({ nested: true, HTMLAttributes: { 'data-type': 'taskItem' }, a11y: { checkboxLabel: node => node.textContent || taskT('待办') } }), Markdown],
      content: toEditorMarkdown(props.initial), contentType: 'markdown',
      editorProps: {
        attributes: { class: 'sm-rich-document', role: 'textbox', 'aria-multiline': 'true', 'aria-label': taskT('描述'), 'data-placeholder': taskT('直接输入内容，支持粘贴图片') },
        handlePaste: (_view, event) => {
          const files = Array.from(event.clipboardData?.files || []);
          if (!files.length) return false;
          event.preventDefault(); callbacks.current.onFiles(files); return true;
        },
        handleDrop: (_view, event) => {
          const files = Array.from(event.dataTransfer?.files || []);
          if (!files.length) return false;
          event.preventDefault(); callbacks.current.onFiles(files); return true;
        },
      },
      onUpdate: ({ editor, transaction }) => { if (!transaction.docChanged) return; markdown.current = fromEditorMarkdown(editor.getMarkdown()); callbacks.current.onChange(markdown.current); },
      onTransaction: () => refresh(value => value + 1),
    });
    instance.current = editor;
    return () => { editor.destroy(); instance.current = undefined; };
  }, []);
  useEffect(() => { instance.current?.setEditable(!props.disabled, false); }, [props.disabled]);
  useImperativeHandle(ref, () => ({
    getMarkdown: () => markdown.current,
    setMarkdown: value => {
      markdown.current = value;
      instance.current?.commands.setContent(toEditorMarkdown(value), { contentType: 'markdown', emitUpdate: false });
    },
    insertFile: (file, append = false) => {
      const editor = instance.current; if (!editor) return;
      const chain = editor.chain().focus(append ? 'end' : undefined);
      if (taskImage(file.path)) chain.setImage({ src: vaultLink(file.path), alt: file.name }).run();
      else chain.insertContent([{ type: 'text', text: file.name, marks: [{ type: 'link', attrs: { href: vaultLink(file.path) } }] }, { type: 'text', text: ' ' }]).run();
    },
  }), []);
  const editor = instance.current;
  const action = (label: string, icon: ReactNode, run: () => void, active = false, disabled = false) => (
    <Tooltip title={taskT(label)} key={label}><Button aria-label={taskT(label)} aria-pressed={active} type={active ? 'primary' : 'text'} icon={icon} disabled={props.disabled || disabled} onMouseDown={event => event.preventDefault()} onClick={run} /></Tooltip>
  );
  const applyLink = () => {
    const url = allowedLink(link);
    if (!url) { setLinkError(true); return; }
    const chain = editor?.chain().focus().extendMarkRange('link');
    if (editor?.state.selection.empty && !editor.isActive('link')) chain?.insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href: url } }] }).run();
    else chain?.setLink({ href: url }).run();
    setLinkOpen(false);
  };
  return <div className="sm-rich-editor">
    <div className="sm-rich-toolbar" role="toolbar" aria-label={taskT('编辑正文')}>
      {action('粗体', <BoldOutlined />, () => { editor?.chain().focus().toggleBold().run(); }, editor?.isActive('bold'))}
      {action('斜体', <ItalicOutlined />, () => { editor?.chain().focus().toggleItalic().run(); }, editor?.isActive('italic'))}
      {action('列表', <UnorderedListOutlined />, () => { editor?.chain().focus().toggleBulletList().run(); }, editor?.isActive('bulletList'))}
      {action('待办', <CheckSquareOutlined />, () => { editor?.chain().focus().toggleTaskList().run(); }, editor?.isActive('taskList'))}
      <Popover trigger="click" open={linkOpen} onOpenChange={value => { setLinkOpen(value); setLinkError(false); if (value) setLink(String(editor?.getAttributes('link').href || '')); }} title={taskT('添加链接')} content={<Space direction="vertical"><Input aria-label={taskT('链接')} value={link} status={linkError ? 'error' : undefined} placeholder="https://" onChange={event => setLink(event.target.value)} onPressEnter={applyLink} /><Space><Button type="primary" onClick={applyLink}>{taskT('应用')}</Button><Button onClick={() => { editor?.chain().focus().unsetLink().run(); setLinkOpen(false); }}>{taskT('取消链接')}</Button></Space>{linkError && <span role="alert">{taskT('请输入有效的链接')}</span>}</Space>}>
        <Button type={editor?.isActive('link') ? 'primary' : 'text'} icon={<LinkOutlined />} aria-label={taskT('链接')} disabled={props.disabled} onMouseDown={event => event.preventDefault()} />
      </Popover>
      {action('图片', <PictureOutlined />, () => props.onImage())}
    </div>
    <div ref={mount} className="sm-rich-mount" />
  </div>;
});
RichTextEditor.displayName = 'RichTextEditor';
