'use client';

import { LoaderCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ApiError } from '@/lib/api';
import {
  deleteTalentDocument,
  fetchTalentDocuments,
  fetchTalentMe,
  uploadTalentDocument,
  type TalentDocument,
} from '@/lib/dashboard-api';

const KINDS = [
  { value: 'CV', label: 'CV / resume' },
  { value: 'CERTIFICATE', label: 'Certificate' },
  { value: 'OTHER', label: 'Other' },
] as const;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TalentDocumentsPanel() {
  const [docs, setDocs] = useState<TalentDocument[]>([]);
  const [uploadsConfigured, setUploadsConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [kind, setKind] = useState<(typeof KINDS)[number]['value']>('CV');
  const [file, setFile] = useState<File | null>(null);

  const refresh = async () => {
    const [me, list] = await Promise.all([fetchTalentMe(), fetchTalentDocuments()]);
    setUploadsConfigured(me.uploadsConfigured);
    setDocs(list);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await refresh();
        if (active) setError(null);
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Unable to load documents.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center gap-2 text-sm text-muted">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading documents…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Documents</p>
        <h1 className="display-title mt-2 text-3xl">Your documents</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Upload a CV or certificates (PDF, PNG, JPG, WebP — max 8MB) for recruiter screening.
        </p>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-brand">{message}</p> : null}

      {!uploadsConfigured ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
          Document uploads are not configured on the server yet. Ask an admin to set Cloudinary
          credentials, then try again.
        </div>
      ) : (
        <form
          className="space-y-3 rounded-2xl border border-border p-4 sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!file) {
              setError('Choose a file to upload.');
              return;
            }
            void (async () => {
              setUploading(true);
              setError(null);
              setMessage(null);
              try {
                await uploadTalentDocument(file, kind);
                setFile(null);
                setMessage('Document uploaded.');
                await refresh();
              } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Upload failed.');
              } finally {
                setUploading(false);
              }
            })();
          }}
        >
          <h2 className="font-display text-lg">Upload</h2>
          <select
            className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            {KINDS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            type="file"
            accept=".pdf,image/png,image/jpeg,image/webp"
            className="w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button type="submit" className="btn-primary" disabled={uploading || !file}>
            {uploading ? 'Uploading…' : 'Upload document'}
          </button>
        </form>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-xl">Uploaded files</h2>
        {docs.length === 0 ? (
          <p className="text-sm text-muted">No documents uploaded yet.</p>
        ) : (
          docs.map((doc) => (
            <article
              key={doc.id}
              className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{doc.fileName}</p>
                <p className="mt-1 text-xs text-muted">
                  {doc.kind} · {formatBytes(doc.byteSize)} ·{' '}
                  {new Date(doc.createdAt).toLocaleDateString('en-NG')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  Open
                </a>
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center gap-2"
                  onClick={() => {
                    void (async () => {
                      setError(null);
                      setMessage(null);
                      try {
                        await deleteTalentDocument(doc.id);
                        setMessage('Document removed.');
                        await refresh();
                      } catch (err) {
                        setError(err instanceof ApiError ? err.message : 'Delete failed.');
                      }
                    })();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
