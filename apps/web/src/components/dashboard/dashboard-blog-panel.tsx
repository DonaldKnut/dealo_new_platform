'use client';

import { BLOG_CATEGORIES } from '@dealo/shared';
import { motion } from 'framer-motion';
import { ExternalLink, ImageIcon, LoaderCircle, Newspaper, Pencil, Plus, Sparkles, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { DashHero, StatusChip } from '@/components/dashboard/dashboard-ui';
import { FormField } from '@/components/forms/form-field';
import { FormModal } from '@/components/ui/form-modal';
import { RichHtmlEditor } from '@/components/ui/rich-html-editor';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  aiBlogDraft,
  createBlogPost,
  deleteBlogPost,
  fetchBlogAdmin,
  updateBlogPost,
  type BlogPost,
} from '@/lib/dashboard-api';
import { cn } from '@/lib/utils';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180);
}

const STATUSES = [
  { id: 'DRAFT', label: 'Draft' },
  { id: 'PUBLISHED', label: 'Published' },
  { id: 'ARCHIVED', label: 'Archived' },
] as const;

export function DashboardBlogPanel() {
  const toast = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');
  const [coverImage, setCoverImage] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [featured, setFeatured] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  const refresh = async () => {
    setPosts(await fetchBlogAdmin());
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await refresh();
        if (active) setError(null);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Unable to load posts.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const startNew = () => {
    setEditingId(null);
    setTitle('');
    setSlug('');
    setExcerpt('');
    setContent('');
    setSeoTitle('');
    setSeoDescription('');
    setStatus('DRAFT');
    setCoverImage('');
    setCategory('');
    setTags('');
    setFeatured(false);
    setAiTopic('');
    setOpen(true);
  };

  const startEdit = (post: BlogPost) => {
    setEditingId(post.id);
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt);
    setContent(post.content);
    setSeoTitle(post.seoTitle ?? '');
    setSeoDescription(post.seoDescription ?? '');
    setStatus(post.status);
    setCoverImage(post.coverImage ?? '');
    setCategory(post.category ?? '');
    setTags((post.tags ?? []).join(', '));
    setFeatured(Boolean(post.featured));
    setOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.replace(/<[^>]*>/g, '').trim() && !/<img/i.test(content)) {
      toast.error('Add some content', 'The post body is empty.');
      return;
    }
    setSaving(true);
    const payload = {
      title,
      slug: slug || slugify(title),
      excerpt,
      content,
      coverImage: coverImage.trim(),
      seoTitle,
      seoDescription,
      status,
      category,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12),
      featured,
    };
    try {
      if (editingId) await updateBlogPost(editingId, payload);
      else await createBlogPost(payload);
      toast.success(editingId ? 'Post updated' : 'Post created', status === 'PUBLISHED' ? 'It is live on the blog.' : undefined);
      setOpen(false);
      await refresh();
    } catch (err) {
      toast.error('Could not save post', err instanceof ApiError ? err.message : '');
    } finally {
      setSaving(false);
    }
  };

  const draftWithAi = async () => {
    setAiBusy(true);
    try {
      const draft = await aiBlogDraft(aiTopic.trim());
      setTitle(draft.title);
      setSlug(slugify(draft.title));
      setExcerpt(draft.excerpt);
      setContent(draft.contentHtml);
      setSeoTitle(draft.seoTitle);
      setSeoDescription(draft.seoDescription);
      setStatus('DRAFT');
      toast.success('AI draft added', 'Read and edit it before publishing.');
    } catch (err) {
      toast.error('AI draft failed', err instanceof ApiError ? err.message : '');
    } finally {
      setAiBusy(false);
    }
  };

  const remove = async (post: BlogPost) => {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    try {
      await deleteBlogPost(post.id);
      toast.success('Post deleted');
      await refresh();
    } catch (err) {
      toast.error('Could not delete', err instanceof ApiError ? err.message : '');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center gap-2 text-sm text-muted">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading blog…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashHero
        eyebrow="Content"
        title="Blog CMS"
        subtitle="Draft and publish hiring guides for Nigeria, Africa and global teams."
        actions={
          <button type="button" className="btn-primary" onClick={startNew}>
            <Plus className="h-4 w-4" /> New post
          </button>
        }
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <section className="space-y-3">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <Newspaper className="mx-auto h-7 w-7 text-muted" />
            <p className="mt-2 font-display text-lg text-foreground">No posts yet</p>
          </div>
        ) : null}
        {posts.map((post, i) => (
          <motion.article
            key={post.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 10) * 0.03 }}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-elevated p-3 sm:flex-row sm:items-center"
          >
            <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl bg-surface sm:h-16 sm:w-24">
              {post.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.coverImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-muted">
                  <ImageIcon className="h-5 w-5" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-start gap-1.5 break-words font-medium text-foreground">
                {post.featured ? <Star className="mt-0.5 h-4 w-4 shrink-0 fill-amber-400 text-amber-400" /> : null}
                {post.title}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <StatusChip status={post.status} />
                <span className="break-all">/blog/{post.slug}</span>
                {post.category ? <span>· {post.category}</span> : null}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {post.status === 'PUBLISHED' ? (
                <Link href={`/blog/${post.slug}`} target="_blank" className="btn-secondary px-3 py-2 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" /> View
                </Link>
              ) : null}
              <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => startEdit(post)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button type="button" className="btn-secondary px-3 py-2 text-xs text-danger" onClick={() => void remove(post)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </motion.article>
        ))}
      </section>

      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        icon={Newspaper}
        title={editingId ? 'Edit post' : 'New post'}
        description={editingId ? `/blog/${slug}` : 'Write it yourself or start from an AI draft.'}
        size="xl"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="blog-form" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update post' : status === 'PUBLISHED' ? 'Publish post' : 'Save draft'}
            </button>
          </>
        }
      >
        <form id="blog-form" onSubmit={save} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0 space-y-4">
            {!editingId ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-brand/40 bg-gradient-to-br from-brand-soft/60 to-amber-300/10 p-3 sm:flex-row">
                <input
                  className="input-field"
                  placeholder="Topic for an AI draft, e.g. How to hire a reliable site electrician"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                />
                <button type="button" className="btn-secondary shrink-0 text-sm" disabled={aiBusy || aiTopic.trim().length < 4} onClick={draftWithAi}>
                  {aiBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Draft with AI
                </button>
              </div>
            ) : null}
            <FormField label="Title">
              <input
                className="input-field text-base font-semibold"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!editingId) setSlug(slugify(e.target.value));
                }}
                required
              />
            </FormField>
            <FormField label="Web address" hint={<span className="break-all">dealo.africa/blog/{slug || 'your-post'}</span>}>
              <input className="input-field" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} required />
            </FormField>
            <FormField label="Excerpt" hint="One or two sentences shown on the blog list and in Google.">
              <textarea className="input-field min-h-[4.5rem]" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} required />
            </FormField>
            <FormField label="Content" hint="Use the toolbar for headings, lists, links and images. Tap HTML to edit the code directly.">
              <RichHtmlEditor value={content} onChange={setContent} placeholder="Write your post. Start with a short intro paragraph…" />
            </FormField>
          </div>

          <div className="space-y-5 lg:border-l lg:border-border lg:pl-6">
            <FormField label="Status">
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-border p-1">
                {STATUSES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatus(s.id)}
                    className={cn(
                      'rounded-lg px-1 py-1.5 text-[11px] font-semibold transition',
                      status === s.id ? 'bg-brand text-white dark:text-[#071f14]' : 'text-muted hover:text-foreground',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </FormField>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-3 text-sm">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="mt-1 accent-[var(--brand)]" />
              <span>
                <span className="font-semibold text-foreground">Feature this post</span>
                <span className="block text-xs text-muted">Shown big at the top of the blog.</span>
              </span>
            </label>
            <FormField label="Category">
              <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">No category</option>
                {BLOG_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Tags" hint="Separate with commas.">
              <input className="input-field" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="hiring, lagos" />
            </FormField>
            <FormField label="Cover image link" optional>
              <input className="input-field" type="url" placeholder="https://…" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} />
              {coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverImage} alt="Cover preview" className="mt-2 h-28 w-full rounded-xl border border-border object-cover" />
              ) : null}
            </FormField>
            <FormField label="SEO title" optional>
              <input className="input-field" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={70} />
            </FormField>
            <FormField label="SEO description" optional>
              <textarea className="input-field min-h-[4.5rem]" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} maxLength={160} />
            </FormField>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
