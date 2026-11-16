import { ashbyAdapter } from './ashby.adapter';
import { bambooHrAdapter } from './bamboohr.adapter';
import { greenhouseAdapter } from './greenhouse.adapter';
import { leverAdapter } from './lever.adapter';
import { recruiteeAdapter } from './recruitee.adapter';
import { smartRecruitersAdapter } from './smartrecruiters.adapter';
import type { AtsApplyAdapter } from './types';
import { workableAdapter } from './workable.adapter';

export type { AtsApplicant, AtsApplyAdapter, AtsApplyResult, AtsCvFile, AtsJobMeta } from './types';

/**
 * Offline ATS adapters. Unsupported hosts fall through to site_assisted.
 * Adapters only submit applications to external ATS hosts; they never publish or re-open Dealo jobs.
 * Partner/org publish trust stays in JobsService.assertCanOpen.
 * Expand next hosts using JobAgentService.externalJobHostFrequency().
 * Workday / Teamtailor boards stay site_assisted (no reliable public apply without tenant keys / SSO).
 */
export const ATS_APPLY_ADAPTERS: AtsApplyAdapter[] = [
  greenhouseAdapter,
  leverAdapter,
  workableAdapter,
  ashbyAdapter,
  smartRecruitersAdapter,
  bambooHrAdapter,
  recruiteeAdapter,
];

export function findAtsAdapter(url: string): AtsApplyAdapter | null {
  if (!url) return null;
  return ATS_APPLY_ADAPTERS.find((adapter) => adapter.canHandle(url)) ?? null;
}
