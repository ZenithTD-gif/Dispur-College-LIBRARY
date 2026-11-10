'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Edit,
  FolderOpen,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  AVAILABLE_CATEGORY_ICONS,
  CategoryIcon,
  type CategoryIconName,
} from '@/components/shared/CategoryIcon';
import { canManageCategoriesDelete } from '@/lib/validation';
import type { AdminRole, CategoryWithCount } from '@/types/library';

export function CategoriesManager({
  initialCategories,
  currentRole,
}: {
  initialCategories: CategoryWithCount[];
  currentRole: AdminRole;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryWithCount[]>(initialCategories);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryWithCount | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconName, setIconName] = useState<CategoryIconName>('BookOpen');

  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const allowDelete = canManageCategoriesDelete(currentRole);

  function openCreate() {
    setEditing(null);
    setName('');
    setDescription('');
    setIconName('BookOpen');
    setErrorMsg(null);
    setModalOpen(true);
  }

  function openEdit(cat: CategoryWithCount) {
    setEditing(cat);
    setName(cat.category_name);
    setDescription(cat.description);
    setIconName((cat.icon_name as CategoryIconName) || 'BookOpen');
    setErrorMsg(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const endpoint = editing
        ? `/api/admin/categories/${editing.id}`
        : '/api/admin/categories';
      const method = editing ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_name: name.trim(),
          description: description.trim(),
          icon_name: iconName,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to save category.');
      }

      if (editing) {
        setCategories((prev) =>
          prev.map((c) =>
            c.id === editing.id
              ? { ...payload.category, book_count: c.book_count }
              : c
          )
        );
      } else {
        setCategories((prev) =>
          [...prev, payload.category].sort((a, b) =>
            a.category_name.localeCompare(b.category_name)
          )
        );
      }
      setModalOpen(false);
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cat: CategoryWithCount) {
    setErrorMsg(null);
    setBusyId(cat.id);
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: 'DELETE',
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Could not delete category.');
      }
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Organize departmental books into academic subject categories.
        </p>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus className="h-4 w-4 text-gold-300" />
          New Category
        </button>
      </div>

      {errorMsg && !modalOpen && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="academic-card p-12 text-center space-y-3">
          <FolderOpen className="mx-auto h-10 w-10 text-gold-500/80" />
          <h3 className="font-serif text-lg font-bold text-navy-900">
            No Categories Created Yet
          </h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Create your first academic category (such as Accounting, Computer Applications, or Management) before uploading departmental books.
          </p>
          <button type="button" onClick={openCreate} className="btn-primary mt-2">
            <Plus className="h-4 w-4 text-gold-300" />
            Create First Category
          </button>
        </div>
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <div key={cat.id} className="academic-card flex flex-col justify-between p-5">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-gold-300">
                  <CategoryIcon name={cat.icon_name} className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-parchment-200 px-2.5 py-0.5 font-mono text-xs font-semibold text-navy-800">
                  {cat.book_count} {cat.book_count === 1 ? 'book' : 'books'}
                </span>
              </div>

              <h3 className="mt-4 font-serif text-base font-bold text-navy-900">
                {cat.category_name}
              </h3>
              <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                /{cat.slug}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {cat.description || 'No description provided.'}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-parchment-200 pt-3">
              <button
                type="button"
                onClick={() => openEdit(cat)}
                className="inline-flex items-center gap-1 rounded-lg border border-parchment-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-900 hover:bg-parchment-100"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </button>

              {allowDelete && (
                <button
                  type="button"
                  disabled={busyId === cat.id}
                  onClick={() => handleDelete(cat)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"
                >
                  {busyId === cat.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-parchment-300 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-parchment-200 pb-3">
              <h3 className="font-serif text-lg font-bold text-navy-900">
                {editing ? 'Edit Category' : 'Create Category'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-parchment-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-800">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Corporate Accounting"
                  className="input-academic"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-800">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of books under this subject category..."
                  className="input-academic"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-800">
                  Icon
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {AVAILABLE_CATEGORY_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setIconName(icon)}
                      className={`flex items-center justify-center rounded-lg border p-2.5 transition-colors ${
                        iconName === icon
                          ? 'border-navy-900 bg-navy-900 text-gold-300'
                          : 'border-parchment-300 bg-white text-navy-800 hover:bg-parchment-100'
                      }`}
                      title={icon}
                    >
                      <CategoryIcon name={icon} className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editing ? (
                    'Update Category'
                  ) : (
                    'Create Category'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

