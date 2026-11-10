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
        <p className="text-sm text-slate-300">
          Organize departmental books into academic subject categories.
        </p>
        <button type="button" onClick={openCreate} className="glass-btn-primary">
          <Plus className="h-4 w-4 text-amethyst-300" />
          New Category
        </button>
      </div>

      {errorMsg && !modalOpen && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-rose-400/35 bg-rose-500/15 p-4 text-sm text-rose-200 backdrop-blur-xl"
        >
          <AlertCircle className="h-5 w-5 text-rose-300 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="liquid-glass p-12 text-center space-y-3">
          <FolderOpen className="mx-auto h-10 w-10 text-amethyst-300" />
          <h3 className="font-serif text-lg font-bold text-white">
            No Categories Created Yet
          </h3>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            Create your first academic category (such as Accounting, Computer Applications, or Management) before uploading departmental books.
          </p>
          <button type="button" onClick={openCreate} className="glass-btn-primary mt-2">
            <Plus className="h-4 w-4 text-amethyst-300" />
            Create First Category
          </button>
        </div>
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <div key={cat.id} className="liquid-glass-hover flex flex-col justify-between p-5">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-blue-500/25 via-amethyst-500/20 to-burgundy-700/25 text-amethyst-300">
                  <CategoryIcon name={cat.icon_name} className="h-5 w-5" />
                </div>
                <span className="glass-pill font-mono text-xs font-semibold text-slate-200">
                  {cat.book_count} {cat.book_count === 1 ? 'book' : 'books'}
                </span>
              </div>

              <h3 className="mt-4 font-serif text-base font-bold text-white">
                {cat.category_name}
              </h3>
              <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                /{cat.slug}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-300/85">
                {cat.description || 'No description provided.'}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/[0.09] pt-3">
              <button
                type="button"
                onClick={() => openEdit(cat)}
                className="glass-btn px-3 py-1.5 text-xs"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </button>

              {allowDelete && (
                <button
                  type="button"
                  disabled={busyId === cat.id}
                  onClick={() => handleDelete(cat)}
                  className="glass-btn-danger px-3 py-1.5 text-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-abyss-950/75 p-4 backdrop-blur-md">
          <div className="liquid-panel w-full max-w-lg p-6">
            <div className="mb-4 flex items-center justify-between border-b border-white/[0.1] pb-3">
              <h3 className="font-serif text-lg font-bold text-white">
                {editing ? 'Edit Category' : 'Create Category'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-white/[0.1] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-2xl border border-rose-400/35 bg-rose-500/15 p-3 text-xs text-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Corporate Accounting"
                  className="liquid-input"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of books under this subject category..."
                  className="liquid-input"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Icon
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {AVAILABLE_CATEGORY_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setIconName(icon)}
                      className={`flex items-center justify-center rounded-2xl border p-2.5 transition-all duration-200 ${
                        iconName === icon
                          ? 'border-white/35 bg-gradient-to-br from-blue-500/40 to-amethyst-600/40 text-white shadow-sm'
                          : 'border-white/[0.12] bg-white/[0.05] text-slate-300 hover:bg-white/[0.12] hover:text-white'
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
                  className="glass-btn"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="glass-btn-primary">
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

