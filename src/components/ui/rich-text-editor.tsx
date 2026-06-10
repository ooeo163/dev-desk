'use client';

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style/text-style';
import { Color } from '@tiptap/extension-text-style/color';
import { Highlight } from '@tiptap/extension-highlight';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered,
  Heading1, Heading2, Heading3, Palette, Highlighter, Undo2, Redo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = [
  { label: '默认', value: undefined },
  { label: '红色', value: '#ef4444' },
  { label: '橙色', value: '#f97316' },
  { label: '黄色', value: '#eab308' },
  { label: '绿色', value: '#22c55e' },
  { label: '青色', value: '#06b6d4' },
  { label: '蓝色', value: '#3b82f6' },
  { label: '紫色', value: '#a855f7' },
  { label: '粉色', value: '#ec4899' },
  { label: '灰色', value: '#6b7280' },
];

const HIGHLIGHT_COLORS = [
  { label: '无', value: undefined },
  { label: '黄', value: '#fef08a' },
  { label: '绿', value: '#bbf7d0' },
  { label: '蓝', value: '#bfdbfe' },
  { label: '粉', value: '#fbcfe8' },
  { label: '橙', value: '#fed7aa' },
];

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

function ToolbarButton({ editor, action, isActive, children, title }: {
  editor: Editor;
  action: () => void;
  isActive: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); action(); }}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded transition-colors',
        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

function ColorPicker({ editor }: { editor: Editor }) {
  return (
    <div className="relative group">
      <button
        type="button"
        title="文字颜色"
        onMouseDown={(e) => e.preventDefault()}
        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Palette className="h-3.5 w-3.5" />
      </button>
      <div className="absolute left-0 top-full z-50 mt-1 hidden group-hover:grid grid-cols-5 gap-0.5 rounded-md border border-border bg-popover p-1 shadow-md min-w-[110px]">
        {COLORS.map((c) => (
          <button
            key={c.label}
            type="button"
            title={c.label}
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().setColor(c.value ?? '').run();
            }}
            className={cn(
              'h-5 w-5 rounded border',
              c.value ? 'border-border' : 'border-dashed border-muted-foreground/40'
            )}
            style={c.value ? { backgroundColor: c.value } : undefined}
          >
            {!c.value && <span className="flex h-full items-center justify-center text-[8px] text-muted-foreground/60">×</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function HighlightPicker({ editor }: { editor: Editor }) {
  return (
    <div className="relative group">
      <button
        type="button"
        title="背景高亮"
        onMouseDown={(e) => e.preventDefault()}
        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Highlighter className="h-3.5 w-3.5" />
      </button>
      <div className="absolute left-0 top-full z-50 mt-1 hidden group-hover:grid grid-cols-6 gap-0.5 rounded-md border border-border bg-popover p-1 shadow-md">
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c.label}
            type="button"
            title={c.label}
            onMouseDown={(e) => {
              e.preventDefault();
              if (c.value) {
                editor.chain().focus().toggleHighlight({ color: c.value }).run();
              } else {
                editor.chain().focus().unsetHighlight().run();
              }
            }}
            className={cn(
              'h-5 w-5 rounded border',
              c.value ? 'border-border' : 'border-dashed border-muted-foreground/40'
            )}
            style={c.value ? { backgroundColor: c.value } : undefined}
          >
            {!c.value && <span className="flex h-full items-center justify-center text-[8px] text-muted-foreground/60">×</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[120px] px-3 py-2',
      },
    },
  });

  const prevValueRef = useRef(value);
  useEffect(() => {
    if (editor && value !== prevValueRef.current && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
    prevValueRef.current = value;
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={cn('flex flex-col rounded-md border border-input bg-background overflow-hidden', className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1 shrink-0">
        <ToolbarButton editor={editor} action={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="粗体">
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton editor={editor} action={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="斜体">
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton editor={editor} action={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="下划线">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton editor={editor} action={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="删除线">
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton editor={editor} action={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="大标题">
          <Heading1 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton editor={editor} action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="中标题">
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton editor={editor} action={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="小标题">
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton editor={editor} action={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="无序列表">
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton editor={editor} action={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="有序列表">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ColorPicker editor={editor} />
        <HighlightPicker editor={editor} />

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton editor={editor} action={() => editor.chain().focus().undo().run()} isActive={false} title="撤销">
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton editor={editor} action={() => editor.chain().focus().redo().run()} isActive={false} title="重做">
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
