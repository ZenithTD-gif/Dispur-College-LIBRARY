'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { BookWithCategory } from '@/types/library';

function ReaderLoadingSkeleton({ title }: { title: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-charcoal-950 p-6 text-center">
      <div className="liquid-panel flex flex-col items-center gap-4 rounded-3xl p-8 max-w-md w-full border border-champagne-300/20 shadow-academic">
        <Loader2 className="h-10 w-10 animate-spin text-champagne-300" />
        <div className="space-y-1">
          <p className="font-serif text-lg font-bold text-offwhite-50">{title}</p>
          <p className="text-xs text-offwhite-300">Loading digital reader environment...</p>
        </div>
      </div>
    </div>
  );
}

const DynamicPdfReader = dynamic(
  () => import('@/components/reader/PdfReader').then((mod) => mod.PdfReader),
  {
    ssr: false,
    loading: () => <ReaderLoadingSkeleton title="Preparing PDF Reader" />,
  }
);

const DynamicEpubReader = dynamic(
  () => import('@/components/reader/EpubReader').then((mod) => mod.EpubReader),
  {
    ssr: false,
    loading: () => <ReaderLoadingSkeleton title="Preparing EPUB Reader" />,
  }
);

export function BookReaderShell({ book }: { book: BookWithCategory }) {
  useEffect(() => {
    fetch(`/api/books/${book.id}/view`, { method: 'POST' }).catch(() => {});
  }, [book.id]);

  const streamUrl = `/api/books/${book.id}/stream`;
  const downloadUrl = `/api/books/${book.id}/download`;

  if (book.file_type === 'epub') {
    return (
      <DynamicEpubReader
        bookId={book.id}
        title={book.title}
        author={book.author}
        streamUrl={streamUrl}
        downloadUrl={downloadUrl}
        allowDownload={book.allow_download}
      />
    );
  }

  return (
    <DynamicPdfReader
      bookId={book.id}
      title={book.title}
      author={book.author}
      streamUrl={streamUrl}
      downloadUrl={downloadUrl}
      allowDownload={book.allow_download}
    />
  );
}

