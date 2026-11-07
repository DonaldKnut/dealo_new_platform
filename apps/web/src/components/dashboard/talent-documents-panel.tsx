'use client';

import { FileCheck2, LoaderCircle, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';

import { DashHero } from '@/components/dashboard/dashboard-ui';
import { FormField } from '@/components/forms/form-field';
import { FormModal } from '@/components/ui/form-modal';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { apiFileHref } from '@/lib/api-base';
import { cn } from '@/lib/utils';
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
  const [uploadOpen, setUploadOpen] = useState(false);
  const toast = useToast();

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
        Loading documentsâ€¦
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashHero
        eyebrow="Documents"
        title="Your documents"
        subtitle="Upload a CV or certificates (PDF, PNG, JPG, WebP â€” max 8 MB) for recruiter screening."
        actions={
          uploadsConfigured ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setFile(null);
                setUploadOpen(true);
              }}
            >
              <Upload className="h-4 w-4" /> Upload
            </button>
          ) : null
        }
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-brand">{message}</p> : null}

      {!uploadsConfigured ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
          Document uploads are not configured on the server yet. Ask an admin to set Cloudinary
          credentials, then try again.
        </div>
      ) : null}

      <FormModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        icon={Upload}
        title="Upload a document"
        description="Recruiters see it when they review your profile."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setUploadOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="doc-upload-form" className="btn-primary" disabled={uploading || !file}>
              {uploading ? 'Uploadingâ€¦' : 'Upload'}
            </button>
          </>
        }
      >
        <form
          id="doc-upload-form"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!file) return;
            void (async () => {
              setUploading(true);
              setError(null);
              setMessage(null);
              try {
                await uploadTalentDocument(file, kind);
                setFile(null);
                setUploadOpen(false);
                toast.success('Document uploaded');
                await refresh();
              } catch (err) {
                toast.error('Upload failed', err instanceof ApiError ? err.message : '');
              } finally {
                setUploading(false);
              }
            })();
          }}
        >
          <FormField label="What is it?">
            <div className="grid grid-cols-1 gap-2 min-[340px]:grid-cols-3">
              {KINDS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setKind(item.value)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                    kind === item.value ? 'border-brand bg-brand-soft text-brand' : 'border-border text-muted hover:border-brand/40',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="File">
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setFile(e.dataTransfer.files?.[0] ?? null);
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed px-3 py-8 text-center text-sm transition',
                file ? 'border-brand bg-brand-soft/50 text-brand' : 'border-border text-muted hover:border-brand hover:text-brand',
              )}
            >
              <input type="file" accept=".pdf,image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              {file ? <FileCheck2 className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
              <span className="max-w-full break-all font-semibold">{file ? file.name : 'Tap to choose a file'}</span>
              <span className="text-xs">{file ? formatBytes(file.size) : 'or drag it here Â· PDF or image, up to 8 MB'}</span>
            </label>
          </FormField>
        </form>
      </FormModal>

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
                  {doc.kind} Â· {formatBytes(doc.byteSize)} Â·{' '}
                  {new Date(doc.createdAt).toLocaleDateString('en-NG')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={apiFileHref(doc.url)}
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
