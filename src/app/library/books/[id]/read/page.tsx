import { notFound } from 'next/navigation';
import { BookReaderShell } from '@/components/reader/BookReaderShell';
import { SetupNotice } from '@/components/shared/SetupNotice';
import { getBookById } from '@/lib/queries/library';
import { isValidUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export default async function ReadBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isValidUuid(id)) {
    notFound();
  }

  const { configured, book } = await getBookById(id);

  if (!configured) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <SetupNotice context="library" />
      </div>
    );
  }

  if (!book) {
    notFound();
  }

  return <BookReaderShell book={book} />;
}

