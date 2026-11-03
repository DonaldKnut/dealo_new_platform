'use client';

import { LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApiError } from '@/lib/api';
import {
  createBlogPost,
  deleteBlogPost,
  fetchBlogAdmin,
  updateBlogPost,
  type BlogPost,
} from '@/lib/dashboard-api';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180);
}

export function DashboardBlogPanel() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');

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

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setSlug('');
    setExcerpt('');
    setContent('');
    setSeoTitle('');
    setSeoDescription('');
    setStatus('DRAFT');
  };

  const fillForm = (post: BlogPost) => {
    setEditingId(post.id);
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt);
    setContent(post.content);
    setSeoTitle(post.seoTitle ?? '');
    setSeoDescription(post.seoDescription ?? '');
    setStatus(post.status);
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
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Content</p>
        <h1 className="display-title mt-2 text-[1.65rem] min-[340px]:text-3xl">Blog CMS</h1>
        <p className="mt-2 text-sm text-muted">
          Draft and publish hiring guides for Nigeria, Africa, and global teams.
        </p>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-brand">{message}</p> : null}

      <form
        className="grid gap-3 rounded-2xl border border-border p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          const payload = {
            title,
            slug: slug || slugify(title),
            excerpt,
            content,
            coverImage: '',
            seoTitle,
            seoDescription,
            status,
          };
          try {
            if (editingId) {
              await updateBlogPost(editingId, payload);
              setMessage('Post updated.');
            } else {
              await createBlogPost(payload);
              setMessage('Post created.');
            }
            resetForm();
            await refresh();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Unable to save post.');
          }
        }}
      >
        <h2 className="font-display text-lg">{editingId ? 'Edit post' : 'New post'}</h2>
        <input
          className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
          placeholder="Title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!editingId) setSlug(slugify(e.target.value));
          }}
          required
        />
        <input
          className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
          placeholder="Slug"
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
          required
        />
        <textarea
          className="min-h-[4.5rem] w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
          placeholder="Excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          required
        />
        <textarea
          className="min-h-[10rem] w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
          placeholder="Content (HTML or markdown text)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <input
          className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
          placeholder="SEO title"
          value={seoTitle}
          onChange={(e) => setSeoTitle(e.target.value)}
        />
        <textarea
          className="min-h-[3.5rem] w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
          placeholder="SEO description"
          value={seoDescription}
          onChange={(e) => setSeoDescription(e.target.value)}
        />
        <select
          className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary">
            {editingId ? 'Update post' : 'Create post'}
          </button>
          {editingId ? (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <section className="space-y-3">
        {posts.map((post) => (
          <article
            key={post.id}
            className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground">{post.title}</p>
              <p className="mt-1 text-xs text-muted">
                /blog/{post.slug} · {post.status}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {post.status === 'PUBLISHED' ? (
                <Link href={`/blog/${post.slug}`} className="btn-secondary">
                  View
                </Link>
              ) : null}
              <button type="button" className="btn-secondary" onClick={() => fillForm(post)}>
                Edit
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  void (async () => {
                    try {
                      await deleteBlogPost(post.id);
                      setMessage('Post deleted.');
                      if (editingId === post.id) resetForm();
                      await refresh();
                    } catch (err) {
                      setError(err instanceof ApiError ? err.message : 'Unable to delete.');
                    }
                  })();
                }}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
