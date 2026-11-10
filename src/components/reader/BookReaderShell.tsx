'use client';

import { useEffect } from 'react';
import { EpubReader } from '@/components/reader/EpubReader';
import { PdfReader } from '@/components/reader/PdfReader';
import type { BookWithCategory } from '@/types/library';

export function BookReaderShell({ book }: { book: BookWithCategory }) {
  useEffect(() => {
    fetch(`/api/books/${book.id}/view`, { method: 'POST' }).catch(() => {});
  }, [book.id]);

  const streamUrl = `/api/books/${book.id}/stream`;
  const downloadUrl = `/api/books/${book.id}/download`;

  if (book.file_type === 'epub') {
    return (
      <EpubReader
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
    <PdfReader
      bookId={book.id}
      title={book.title}
      author={book.author}
      streamUrl={streamUrl}
      downloadUrl={downloadUrl}
      allowDownload={book.allow_download}
    />
  );
}

