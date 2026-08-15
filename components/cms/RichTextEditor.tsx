'use client';

/**
 * RichTextEditor — Tiptap-powered WYSIWYG editor for CMS content.
 *
 * Supports: bold, italic, underline, strikethrough, headings, lists,
 * blockquotes, links, images, YouTube embeds, text alignment, code blocks.
 *
 * Stores content as HTML strings (backward-compatible with plain text).
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { useCallback, useEffect, useRef, useState } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Írj ide...',
  minHeight = '120px',
  className = '',
}: RichTextEditorProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: 'bg-gray-900 text-green-400 p-3 rounded font-mono text-sm' } },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline hover:text-blue-800' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'max-w-full h-auto rounded-lg my-2' },
        allowBase64: false,
      }),
      Youtube.configure({
        width: 560,
        height: 315,
        HTMLAttributes: { class: 'rounded-lg my-2' },
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none px-4 py-3 ${className}`,
        style: `min-height: ${minHeight}`,
      },
    },
  });

  // Sync external content changes (e.g. switching locale tab)
  const prevContent = useRef(content);
  useEffect(() => {
    if (editor && content !== prevContent.current && content !== editor.getHTML()) {
      editor.commands.setContent(content || '', { emitUpdate: false });
    }
    prevContent.current = content;
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setShowLinkModal(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const insertImage = useCallback(() => {
    if (!editor || !imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setShowImageModal(false);
    setImageUrl('');
  }, [editor, imageUrl]);

  const insertYoutube = useCallback(() => {
    if (!editor || !youtubeUrl) return;
    editor.chain().focus().setYoutubeVideo({ src: youtubeUrl }).run();
    setShowYoutubeModal(false);
    setYoutubeUrl('');
  }, [editor, youtubeUrl]);

  if (!editor) return null;

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        {/* Text formatting */}
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Félkövér (Ctrl+B)"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Dőlt (Ctrl+I)"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Aláhúzás (Ctrl+U)"
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Áthúzás"
        >
          <s>S</s>
        </ToolbarButton>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Címsor 1"
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Címsor 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Címsor 3"
        >
          H3
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Felsorolás"
        >
          •≡
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Számozott lista"
        >
          1.
        </ToolbarButton>

        <ToolbarDivider />

        {/* Block elements */}
        <ToolbarButton
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Idézet"
        >
          ❝
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Kódblokk"
        >
          {'</>'}
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Inline kód"
        >
          {'`c`'}
        </ToolbarButton>

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Balra igazítás"
        >
          ≡←
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Középre igazítás"
        >
          ≡↔
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Jobbra igazítás"
        >
          ≡→
        </ToolbarButton>

        <ToolbarDivider />

        {/* Embeds */}
        <ToolbarButton
          active={editor.isActive('link')}
          onClick={() => {
            const existingUrl = editor.getAttributes('link').href || '';
            setLinkUrl(existingUrl);
            setShowLinkModal(true);
          }}
          title="Link beszúrása"
        >
          🔗
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setShowImageModal(true)}
          title="Kép beszúrása"
        >
          🖼️
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setShowYoutubeModal(true)}
          title="YouTube videó beszúrása"
        >
          ▶️
        </ToolbarButton>

        <ToolbarDivider />

        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Visszavonás (Ctrl+Z)"
        >
          ↩
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Újra (Ctrl+Y)"
        >
          ↪
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Formázás törlése"
        >
          ✕
        </ToolbarButton>
      </div>

      {/* Editor content area */}
      <EditorContent editor={editor} />

      {/* Character count */}
      <div className="px-3 py-1 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-right">
        {editor.storage.characterCount?.characters?.() ?? editor.state.doc.textContent.length} karakter
      </div>

      {/* Link modal */}
      {showLinkModal && (
        <Modal title="Link beszúrása" onClose={() => setShowLinkModal(false)}>
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && setLink()}
          />
          <div className="flex gap-2 mt-3">
            <button onClick={setLink} className="px-4 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
              OK
            </button>
            {editor.isActive('link') && (
              <button
                onClick={() => { editor.chain().focus().unsetLink().run(); setShowLinkModal(false); }}
                className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
              >
                Link eltávolítása
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* Image modal */}
      {showImageModal && (
        <Modal title="Kép beszúrása" onClose={() => setShowImageModal(false)}>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://... (kép URL)"
            className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && insertImage()}
          />
          <div className="flex gap-2 mt-3">
            <button onClick={insertImage} className="px-4 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
              Beszúrás
            </button>
          </div>
        </Modal>
      )}

      {/* YouTube modal */}
      {showYoutubeModal && (
        <Modal title="YouTube videó beszúrása" onClose={() => setShowYoutubeModal(false)}>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && insertYoutube()}
          />
          <div className="flex gap-2 mt-3">
            <button onClick={insertYoutube} className="px-4 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
              Beszúrás
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── Toolbar helpers ─── */

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        px-2 py-1 rounded text-xs font-medium transition-colors
        ${active
          ? 'bg-red-100 text-red-700 ring-1 ring-red-300'
          : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-gray-300 mx-1" />;
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
