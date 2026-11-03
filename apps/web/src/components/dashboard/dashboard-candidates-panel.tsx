'use client';

import { LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { isStaffRole } from '@/hooks/use-auth-session';
import { RoleAutocomplete } from '@/components/ui/role-autocomplete';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  addShortlistEntry,
  createCandidate,
  createShortlist,
  fetchAuthMe,
  fetchCandidates,
  fetchDashboardRequests,
  fetchShortlists,
  updateCandidate,
  type Candidate,
  type DashboardRequest,
  type Shortlist,
} from '@/lib/dashboard-api';

const SCREEN_STATUSES = ['NEW', 'SCREENING', 'SCREENED', 'REJECTED'] as const;

export function DashboardCandidatesPanel() {
  const toast = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [requests, setRequests] = useState<DashboardRequest[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [shortlistTitle, setShortlistTitle] = useState('');
  const [hireInquiryId, setHireInquiryId] = useState('');
  const [selectedShortlistId, setSelectedShortlistId] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');

  const refresh = async () => {
    const [me, cand, lists, reqs] = await Promise.all([
      fetchAuthMe(),
      fetchCandidates(),
      fetchShortlists(),
      fetchDashboardRequests(),
    ]);
    setIsAdmin(isStaffRole(me.roles));
    setCandidates(cand);
    setShortlists(lists);
    setRequests(reqs);
    if (!hireInquiryId && reqs[0]) setHireInquiryId(reqs[0].id);
    if (!selectedShortlistId && lists[0]) setSelectedShortlistId(lists[0].id);
    if (!selectedCandidateId && cand[0]) setSelectedCandidateId(cand[0].id);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await refresh();
        if (active) setError(null);
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Unable to load candidates.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center gap-2 text-sm text-muted">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading candidates…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">{isAdmin ? 'Screening' : 'Shortlists'}</p>
        <h1 className="display-title mt-2 text-[1.65rem] min-[340px]:text-3xl">
          {isAdmin ? 'Candidates & shortlists' : 'Your shortlists'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {isAdmin
            ? 'Add candidates, mark screening status, and rank shortlists against hire requests.'
            : 'Review candidates shortlisted against your hiring requests.'}
        </p>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-brand">{message}</p> : null}

      {isAdmin ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <form
            className="space-y-3 rounded-2xl border border-border p-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setError(null);
              setMessage(null);
              try {
                await createCandidate({
                  fullName,
                  email,
                  roleTitle,
                  screenStatus: 'NEW',
                });
                setFullName('');
                setEmail('');
                setRoleTitle('');
                setMessage('Candidate added.');
                toast.success('Candidate added');
                await refresh();
              } catch (err) {
                const msg = err instanceof ApiError ? err.message : 'Unable to add candidate.';
                setError(msg);
                toast.error('Could not add candidate', msg);
              }
            }}
          >
            <h2 className="font-display text-lg">Add candidate</h2>
            <input
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <input
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <RoleAutocomplete
              value={roleTitle}
              onChange={setRoleTitle}
              placeholder="Role title — start typing for suggestions"
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
            />
            <button type="submit" className="btn-primary">
              Save candidate
            </button>
          </form>

          <form
            className="space-y-3 rounded-2xl border border-border p-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setError(null);
              setMessage(null);
              try {
                await createShortlist({
                  hireInquiryId,
                  title: shortlistTitle || 'Shortlist',
                });
                setShortlistTitle('');
                setMessage('Shortlist created.');
                await refresh();
              } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Unable to create shortlist.');
              }
            }}
          >
            <h2 className="font-display text-lg">Create shortlist</h2>
            <select
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
              value={hireInquiryId}
              onChange={(e) => setHireInquiryId(e.target.value)}
              required
            >
              <option value="">Select hire request</option>
              {requests.map((req) => (
                <option key={req.id} value={req.id}>
                  {req.companyName} — {req.roleTitle}
                </option>
              ))}
            </select>
            <input
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
              placeholder="Shortlist title"
              value={shortlistTitle}
              onChange={(e) => setShortlistTitle(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary" disabled={!hireInquiryId}>
              Create shortlist
            </button>
          </form>
        </div>
      ) : null}

      {isAdmin && shortlists.length > 0 ? (
        <form
          className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-end"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setMessage(null);
            try {
              await addShortlistEntry(selectedShortlistId, {
                candidateId: selectedCandidateId,
                rank: 0,
              });
              setMessage('Candidate added to shortlist.');
              await refresh();
            } catch (err) {
              setError(err instanceof ApiError ? err.message : 'Unable to add to shortlist.');
            }
          }}
        >
          <div className="flex-1">
            <label className="text-xs text-muted">Shortlist</label>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
              value={selectedShortlistId}
              onChange={(e) => setSelectedShortlistId(e.target.value)}
            >
              {shortlists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted">Candidate</label>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
              value={selectedCandidateId}
              onChange={(e) => setSelectedCandidateId(e.target.value)}
            >
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.fullName}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-secondary">
            Add to shortlist
          </button>
        </form>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-display text-lg">Candidates</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted">
                    No candidates yet.
                  </td>
                </tr>
              ) : (
                candidates.map((candidate) => (
                  <tr key={candidate.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{candidate.fullName}</p>
                      <p className="text-xs text-muted">{candidate.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{candidate.roleTitle || '—'}</td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <select
                          className="rounded-lg border border-border bg-surface-elevated px-2 py-1.5 text-xs"
                          value={candidate.screenStatus}
                          onChange={(event) => {
                            void (async () => {
                              try {
                                await updateCandidate(candidate.id, {
                                  fullName: candidate.fullName,
                                  email: candidate.email,
                                  phone: candidate.phone ?? '',
                                  roleTitle: candidate.roleTitle ?? '',
                                  location: candidate.location ?? '',
                                  notes: candidate.notes ?? '',
                                  screenStatus: event.target.value,
                                });
                                await refresh();
                              } catch (err) {
                                setError(
                                  err instanceof ApiError
                                    ? err.message
                                    : 'Unable to update screening status.',
                                );
                              }
                            })();
                          }}
                        >
                          {SCREEN_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs font-semibold text-brand">
                          {candidate.screenStatus}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl">Shortlists</h2>
        {shortlists.length === 0 ? (
          <p className="text-sm text-muted">No shortlists yet.</p>
        ) : (
          shortlists.map((list) => (
            <article key={list.id} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-foreground">{list.title}</h3>
                  <p className="mt-1 text-xs text-muted">
                    {list.hireInquiry.companyName} · {list.hireInquiry.roleTitle} ·{' '}
                    {list.hireInquiry.status}
                  </p>
                </div>
                <span className="text-xs text-muted">{list.entries.length} candidates</span>
              </div>
              <ul className="mt-3 space-y-2">
                {list.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 text-sm"
                  >
                    <span>
                      #{entry.rank + 1} {entry.candidate.fullName}
                    </span>
                    <span className="text-xs text-muted">{entry.candidate.screenStatus}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
