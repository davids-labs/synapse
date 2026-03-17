import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface NotesEditorProps {
  value: string;
  onSave: (content: string) => Promise<void>;
}

export function NotesEditor({ value, onSave }: NotesEditorProps) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid h-full gap-4 lg:grid-cols-2">
      <textarea
        className="h-full min-h-[240px] rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-white"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="scrollbar-thin overflow-auto rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-slate-200">
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {draft}
        </ReactMarkdown>
      </div>
      <div className="lg:col-span-2 flex justify-end">
        <button
          className="rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-sm text-white"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save notes'}
        </button>
      </div>
    </div>
  );
}
