'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  Undo,
  Redo,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        hardBreak: {
          keepMarks: false,
          HTMLAttributes: {
            class: 'hard-break',
          },
        },
      }).configure({
        link: false,
        underline: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
    ],
    content: value || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[200px] px-3 py-2',
      },
      handlePaste: (view, event, slice) => {
        // Let TipTap handle paste with its built-in HTML parsing
        // The extensions we added (TextStyle, Color, FontFamily, TextAlign, Underline)
        // will preserve most formatting from pasted content
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes (e.g. when an edit form loads data).
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="min-h-50 rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  const setLink = () => {
    const previous = (editor.getAttributes('link').href as string) || '';
    const url = window.prompt('Enter URL', previous);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const btn = (active: boolean) =>
    `h-8 w-8 ${active ? 'bg-primary text-primary-foreground' : ''}`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 rounded-md border bg-muted/30 p-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btn(editor.isActive('bold'))}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btn(editor.isActive('italic'))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btn(editor.isActive('underline'))}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-5 w-px bg-border" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btn(editor.isActive({ textAlign: 'left' }))}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          aria-label="Align left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btn(editor.isActive({ textAlign: 'center' }))}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          aria-label="Align center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btn(editor.isActive({ textAlign: 'right' }))}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          aria-label="Align right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-5 w-px bg-border" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btn(editor.isActive('bulletList'))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet list"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btn(editor.isActive('orderedList'))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Ordered list"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btn(editor.isActive('link'))}
          onClick={setLink}
          aria-label="Insert link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() =>
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
          }
          disabled={!editor.isActive('link')}
          aria-label="Remove link"
        >
          <Unlink className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-5 w-px bg-border" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          aria-label="Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          aria-label="Redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <EditorContent
        editor={editor}
        className="min-h-50 rounded-md border bg-white p-3 text-sm focus-within:ring-1 focus-within:ring-ring [&_.ProseMirror]:min-h-50 [&_.ProseMirror]:outline-none [&_.ProseMirror]:p-2 [&_a]:text-blue-600 [&_a]:underline [&_a]:cursor-pointer [&_strong]:font-bold [&_em]:italic [&_u]:underline"
      />
      <p className="text-xs text-muted-foreground">
        Use the toolbar to format text. Paste content from other sources to
        preserve formatting.
      </p>
    </div>
  );
}

export default RichTextEditor;
