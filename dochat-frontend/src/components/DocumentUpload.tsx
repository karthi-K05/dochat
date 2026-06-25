import { useRef } from 'react';
import { FileUp, Loader2, Paperclip } from 'lucide-react';
import { clsx } from 'clsx';

interface DocumentUploadProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  variant?: 'button' | 'dropzone';
}

export function DocumentUpload({
  onUpload,
  isUploading,
  variant = 'button',
}: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file?: File) => {
    if (!file) return;
    await onUpload(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      className="sr-only"
      onChange={(event) => void handleFile(event.target.files?.[0])}
      accept=".pdf,.doc,.docx,.txt,.md,.csv"
    />
  );

  if (variant === 'dropzone') {
    return (
      <label
        className={clsx(
          'group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-700/80 bg-zinc-950/55 p-6 text-center transition hover:border-indigo-400/80 hover:bg-zinc-900/80',
          isUploading && 'pointer-events-none opacity-80',
        )}
      >
        {input}
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-100 transition group-hover:bg-indigo-500">
          {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileUp className="h-5 w-5" />}
        </span>
        <span>
          <span className="block text-sm font-medium text-zinc-100">
            {isUploading ? 'Processing document...' : 'Upload source material'}
          </span>
          <span className="mt-1 block text-xs text-zinc-500">
            PDF, DOCX, TXT, Markdown, or CSV
          </span>
        </span>
      </label>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={isUploading}
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
      aria-label="Upload document"
      title="Upload document"
    >
      {input}
      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
    </button>
  );
}
