'use client';

import { ListChecks, ListPlus, LoaderCircle, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { DashHero } from '@/components/dashboard/dashboard-ui';
import { FormField } from '@/components/forms/form-field';
import { FormModal } from '@/components/ui/form-modal';
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
  const [modal, setModal] = useState<'candidate' | 'shortlist' | 'entry' | null>(null);

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
    <div className="space-y-6">
      <DashHero
        eyebrow={isAdmin ? 'Screening' : 'Shortlists'}
        title={isAdmin ? 'Candidates & shortlists' : 'Your shortlists'}
        subtitle={
          isAdmin
            ? 'Add candidates, mark screening status, and rank shortlists against hire requests.'
            : 'Review candidates shortlisted against your hiring requests.'
        }
        actions={
          isAdmin ? (
            <>
              <button type="button" className="btn-primary text-sm" onClick={() => setModal('candidate')}>
                <UserPlus className="h-4 w-4" /> Add candidate
              </button>
              <button type="button" className="btn-secondary text-sm" onClick={() => setModal('shortlist')}>
                <ListPlus className="h-4 w-4" /> New shortlist
              </button>
              {shortlists.length > 0 && candidates.length > 0 ? (
                <button type="button" className="btn-secondary text-sm" onClick={() => setModal('entry')}>
                  <ListChecks className="h-4 w-4" /> Add to shortlist
                </button>
              ) : null}
            </>
          ) : null
        }
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-brand">{message}</p> : null}

      <FormModal
        open={modal === 'candidate'}
        onClose={() => setModal(null)}
        icon={UserPlus}
        title="Add candidate"
        description="They start as New. Mark screening progress from the table."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button type="submit" form="candidate-form" className="btn-primary">
              Save candidate
            </button>
          </>
        }
      >
        <form
          id="candidate-form"
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setMessage(null);
            try {
              await createCandidate({ fullName, email, roleTitle, screenStatus: 'NEW' });
              setFullName('');
              setEmail('');
              setRoleTitle('');
              toast.success('Candidate added');
              setModal(null);
              await refresh();
            } catch (err) {
              toast.error('Could not add candidate', err instanceof ApiError ? err.message : 'Unable to add candidate.');
            }
          }}
        >
          <FormField label="Full name">
            <input className="input-field" placeholder="Adaeze Okafor" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </FormField>
          <FormField label="Email">
            <input className="input-field" placeholder="adaeze@email.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FormField>
          <FormField label="Role" hint="Start typing for suggestions.">
            <RoleAutocomplete value={roleTitle} onChange={setRoleTitle} placeholder="Site electrician" className="input-field" />
          </FormField>
        </form>
      </FormModal>

      <FormModal
        open={modal === 'shortlist'}
        onClose={() => setModal(null)}
        icon={ListPlus}
        title="New shortlist"
        description="A ranked list of people for one hiring request. The client sees it in their dashboard."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button type="submit" form="shortlist-form" className="btn-primary" disabled={!hireInquiryId}>
              Create shortlist
            </button>
          </>
        }
      >
        <form
          id="shortlist-form"
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              await createShortlist({ hireInquiryId, title: shortlistTitle || 'Shortlist' });
              setShortlistTitle('');
              toast.success('Shortlist created');
              setModal(null);
              await refresh();
            } catch (err) {
              toast.error('Could not create shortlist', err instanceof ApiError ? err.message : '');
            }
          }}
        >
          <FormField label="Hiring request">
            <select className="input-field" value={hireInquiryId} onChange={(e) => setHireInquiryId(e.target.value)} required>
              <option value="">Select hire request</option>
              {requests.map((req) => (
                <option key={req.id} value={req.id}>
                  {req.companyName} — {req.roleTitle}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Title">
            <input className="input-field" placeholder="Electricians · first round" value={shortlistTitle} onChange={(e) => setShortlistTitle(e.target.value)} required />
          </FormField>
        </form>
      </FormModal>

      <FormModal
        open={modal === 'entry'}
        onClose={() => setModal(null)}
        icon={ListChecks}
        title="Add to shortlist"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button type="submit" form="entry-form" className="btn-primary">
              Add to shortlist
            </button>
          </>
        }
      >
        <form
          id="entry-form"
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              await addShortlistEntry(selectedShortlistId, { candidateId: selectedCandidateId, rank: 0 });
              toast.success('Added to shortlist');
              setModal(null);
              await refresh();
            } catch (err) {
              toast.error('Could not add', err instanceof ApiError ? err.message : '');
            }
          }}
        >
          <FormField label="Shortlist">
            <select className="input-field" value={selectedShortlistId} onChange={(e) => setSelectedShortlistId(e.target.value)}>
              {shortlists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.title}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Candidate">
            <select className="input-field" value={selectedCandidateId} onChange={(e) => setSelectedCandidateId(e.target.value)}>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.fullName}
                </option>
              ))}
            </select>
          </FormField>
        </form>
      </FormModal>

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
