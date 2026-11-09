import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Subscription } from 'rxjs';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AtsEventsService, type AtsEvent } from './ats-events.service';

/** Turns pipeline events into in-app notifications for the hiring team and the applicant. */
@Injectable()
export class AtsNotificationsService implements OnModuleInit, OnModuleDestroy {
  private subscription?: Subscription;

  constructor(
    private readonly events: AtsEventsService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.subscription = this.events.events$.subscribe(
      (event) => void this.handle(event).catch(() => undefined),
    );
  }

  onModuleDestroy() {
    this.subscription?.unsubscribe();
  }

  private async handle(event: AtsEvent) {
    const application = await this.prisma.application.findUnique({
      where: { id: event.applicationId },
      select: {
        name: true,
        userId: true,
        job: { select: { title: true } },
        organization: { select: { name: true } },
      },
    });
    if (!application) return;

    if (event.type === 'application.created') {
      await this.notifications.notifyOrganization(event.organizationId, {
        type: 'ats.application.created',
        title: `New applicant for ${application.job.title}`,
        body: `${application.name} just applied.`,
        link: `/dashboard/ats/jobs/${event.jobId}`,
      });
      return;
    }

    await this.notifications.notify([application.userId], {
      type: 'ats.application.stage_changed',
      title: `Your application for ${application.job.title} moved to ${event.to}`,
      body: application.organization.name,
      link: '/dashboard/applications',
    });
  }
}
