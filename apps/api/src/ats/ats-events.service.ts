import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

import type { AuthUser } from '../auth/auth.types';

export type AtsEvent =
  | { type: 'application.created'; organizationId: string; jobId: string; applicationId: string }
  | { type: 'application.stage_changed'; organizationId: string; jobId: string; applicationId: string; from: string; to: string; actor: AuthUser };

/** In-process feed of pipeline events, so add-ons such as Hiring Agents can react without the ATS depending on them. */
@Injectable()
export class AtsEventsService {
  private readonly subject = new Subject<AtsEvent>();
  readonly events$ = this.subject.asObservable();

  emit(event: AtsEvent) {
    this.subject.next(event);
  }
}
