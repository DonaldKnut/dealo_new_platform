import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type {
  AttendanceInput,
  CreatePlacementInput,
  CreateWorkSiteInput,
  UpdatePlacementInput,
  UpdateWorkSiteInput,
} from '@dealo/shared';
import {
  AttendanceKind,
  CoverRequestStatus,
  PlacementStatus,
  Prisma,
  type AttendanceEvent,
  type WorkSite,
} from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { CandidatesService } from '../candidates/candidates.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  distanceMeters,
  hhmmToMinutes,
  minutesToHhmm,
  previousWorkDates,
  siteClock,
  siteTimeToUtc,
  zoneLabel,
} from './ops-time';

const SWEEP_MS = 5 * 60_000;
const ATTENDANCE_WINDOW_DAYS = 30;
const ARRIVAL_WINDOW_DAYS = 7;

type Severity = 'info' | 'success' | 'warn' | 'critical';
type Actor = 'agent' | 'staff' | 'worker';

export type RosterStatus =
  | 'ON_SITE'
  | 'LATE'
  | 'CHECKED_OUT'
  | 'EXPECTED'
  | 'NO_SHOW'
  | 'STANDBY'
  | 'COVERING';

function isSunday(workDate: string) {
  const [y, m, d] = workDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}

function shortName(fullName: string) {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
}

@Injectable()
export class OpsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OpsService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly candidates: CandidatesService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.sweep(), SWEEP_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  // ----------------------------------------------------------------- helpers

  private event(
    siteId: string,
    type: string,
    title: string,
    options: { severity?: Severity; actor?: Actor; detail?: string; meta?: Prisma.InputJsonValue } = {},
  ) {
    return this.prisma.opsEvent.create({
      data: {
        siteId,
        type,
        title,
        severity: options.severity ?? 'info',
        actor: options.actor ?? 'agent',
        detail: options.detail,
        meta: options.meta,
      },
    });
  }

  private async staffName(user: AuthUser) {
    const row = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, email: true },
    });
    return row ? `${row.firstName} ${row.lastName}`.trim() || row.email : 'Staff';
  }

  private async requireSite(id: string) {
    const site = await this.prisma.workSite.findUnique({ where: { id } });
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }

  // ------------------------------------------------------------------- sites

  async createSite(input: CreateWorkSiteInput, actor: AuthUser) {
    const site = await this.prisma.workSite.create({
      data: { ...input, createdById: actor.id },
    });
    await this.event(site.id, 'SITE_CREATED', `Site set up by ${await this.staffName(actor)}`, {
      actor: 'staff',
      detail: `Geofence ${site.radiusMeters}m · shift ${site.shiftStart}–${site.shiftEnd}`,
    });
    return site;
  }

  async updateSite(id: string, input: UpdateWorkSiteInput) {
    await this.requireSite(id);
    return this.prisma.workSite.update({ where: { id }, data: input });
  }

  async listSites() {
    const sites = await this.prisma.workSite.findMany({ orderBy: { createdAt: 'desc' } });
    return Promise.all(
      sites.map(async (site) => {
        const { workDate } = siteClock(new Date(), site.timezone);
        const [placements, onSiteToday, openCovers] = await Promise.all([
          this.prisma.placement.findMany({
            where: { siteId: site.id, status: PlacementStatus.ACTIVE },
            select: { isStandby: true },
          }),
          this.prisma.attendanceEvent.findMany({
            where: { siteId: site.id, workDate, kind: AttendanceKind.CHECK_IN, withinGeofence: true },
            distinct: ['placementId'],
            select: { placementId: true },
          }),
          this.prisma.coverRequest.count({ where: { siteId: site.id, status: CoverRequestStatus.OPEN } }),
        ]);
        return {
          ...site,
          crew: placements.filter((p) => !p.isStandby).length,
          standby: placements.filter((p) => p.isStandby).length,
          onSiteToday: onSiteToday.length,
          openCovers,
        };
      }),
    );
  }

  // -------------------------------------------------------------- placements

  async addPlacement(siteId: string, input: CreatePlacementInput, actor: AuthUser) {
    await this.requireSite(siteId);
    const candidate = await this.prisma.candidate.findUnique({ where: { id: input.candidateId } });
    if (!candidate) throw new NotFoundException('Professional not found');

    const placement = await this.prisma.placement.create({
      data: {
        siteId,
        candidateId: candidate.id,
        roleTitle: input.roleTitle,
        isStandby: input.isStandby,
        startDate: input.startDate ? new Date(input.startDate) : new Date(),
      },
    });
    await this.event(
      siteId,
      'PLACEMENT_ADDED',
      `${shortName(candidate.fullName)} added ${input.isStandby ? 'as standby' : 'to the crew'}`,
      { actor: 'staff', detail: `${input.roleTitle} · by ${await this.staffName(actor)}` },
    );
    return placement;
  }

  async updatePlacement(id: string, input: UpdatePlacementInput) {
    const existing = await this.prisma.placement.findUnique({ where: { id }, include: { candidate: true } });
    if (!existing) throw new NotFoundException('Placement not found');
    const placement = await this.prisma.placement.update({
      where: { id },
      data: {
        isStandby: input.isStandby,
        roleTitle: input.roleTitle,
        ...(input.ended ? { status: PlacementStatus.ENDED, endDate: new Date() } : {}),
      },
    });
    if (input.ended) {
      await this.event(existing.siteId, 'PLACEMENT_ENDED', `${shortName(existing.candidate.fullName)} finished at this site`, {
        actor: 'staff',
      });
    }
    return placement;
  }

  // ----------------------------------------------------------------- console

  async siteConsole(siteId: string) {
    const site = await this.requireSite(siteId);
    const now = new Date();
    const clock = siteClock(now, site.timezone);
    const shiftStartMin = hhmmToMinutes(site.shiftStart);
    const graceOver = clock.minutes > shiftStartMin + site.graceMinutes;
    const attendanceDates = previousWorkDates(clock.workDate, ATTENDANCE_WINDOW_DAYS);

    const [placements, recentAttendance, covers, feed] = await Promise.all([
      this.prisma.placement.findMany({
        where: { siteId, status: PlacementStatus.ACTIVE },
        include: { candidate: { select: { id: true, fullName: true, phone: true, roleTitle: true } } },
        orderBy: [{ isStandby: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.attendanceEvent.findMany({
        where: { siteId, workDate: { in: attendanceDates } },
        orderBy: { occurredAt: 'asc' },
      }),
      this.prisma.coverRequest.findMany({
        where: {
          siteId,
          OR: [{ status: CoverRequestStatus.OPEN }, { workDate: clock.workDate }],
        },
        orderBy: { openedAt: 'desc' },
        take: 20,
      }),
      this.prisma.opsEvent.findMany({ where: { siteId }, orderBy: { createdAt: 'desc' }, take: 40 }),
    ]);

    const todayEvents = recentAttendance.filter((event) => event.workDate === clock.workDate);
    const firstIn = (placementId: string, events: AttendanceEvent[]) =>
      events.find((e) => e.placementId === placementId && e.kind === AttendanceKind.CHECK_IN && e.withinGeofence);
    const lastOut = (placementId: string, events: AttendanceEvent[]) =>
      [...events].reverse().find((e) => e.placementId === placementId && e.kind === AttendanceKind.CHECK_OUT);
    const coveringToday = new Set(
      covers
        .filter((c) => c.workDate === clock.workDate && c.status === CoverRequestStatus.FILLED && c.standbyPlacementId)
        .map((c) => c.standbyPlacementId as string),
    );

    const roster = placements.map((placement) => {
      const checkIn = firstIn(placement.id, todayEvents);
      const checkOut = lastOut(placement.id, todayEvents);
      let status: RosterStatus;
      if (checkOut && checkIn) status = 'CHECKED_OUT';
      else if (checkIn) status = checkIn.lateMinutes > 0 ? 'LATE' : 'ON_SITE';
      else if (placement.isStandby) status = coveringToday.has(placement.id) ? 'COVERING' : 'STANDBY';
      else status = graceOver && !isSunday(clock.workDate) ? 'NO_SHOW' : 'EXPECTED';

      return {
        placementId: placement.id,
        candidateId: placement.candidate.id,
        name: placement.candidate.fullName,
        shortName: shortName(placement.candidate.fullName),
        phone: placement.candidate.phone,
        roleTitle: placement.roleTitle,
        isStandby: placement.isStandby,
        status,
        checkInAt: checkIn?.occurredAt ?? null,
        checkInLocal: checkIn ? minutesToHhmm(siteClock(checkIn.occurredAt, site.timezone).minutes) : null,
        checkOutAt: checkOut?.occurredAt ?? null,
        lateMinutes: checkIn?.lateMinutes ?? 0,
        distanceMeters: checkIn?.distanceMeters ?? null,
      };
    });

    // Attendance: days with an in-fence check-in / scheduled days (Mon–Sat, since start, past grace today).
    let scheduled = 0;
    let present = 0;
    for (const placement of placements.filter((p) => !p.isStandby)) {
      const start = siteClock(placement.startDate, site.timezone).workDate;
      for (const date of attendanceDates) {
        if (date < start || isSunday(date)) continue;
        if (date === clock.workDate && !graceOver) continue;
        scheduled += 1;
        if (recentAttendance.some((e) => e.placementId === placement.id && e.workDate === date && e.kind === AttendanceKind.CHECK_IN && e.withinGeofence)) {
          present += 1;
        }
      }
    }

    const arrivalDates = new Set(previousWorkDates(clock.workDate, ARRIVAL_WINDOW_DAYS));
    const arrivals = new Map<string, number>();
    for (const event of recentAttendance) {
      if (event.kind !== AttendanceKind.CHECK_IN || !event.withinGeofence || !arrivalDates.has(event.workDate)) continue;
      const key = `${event.placementId}:${event.workDate}`;
      if (!arrivals.has(key)) arrivals.set(key, siteClock(event.occurredAt, site.timezone).minutes);
    }
    const arrivalValues = [...arrivals.values()];

    const standbyFree = roster.filter((row) => row.isStandby && row.status === 'STANDBY').length;
    const openCovers = covers.filter((c) => c.status === CoverRequestStatus.OPEN);

    return {
      site,
      clock: { workDate: clock.workDate, now: minutesToHhmm(clock.minutes), zone: zoneLabel(site.timezone), graceOver },
      metrics: {
        attendanceRate: scheduled ? Math.round((present / scheduled) * 1000) / 10 : null,
        attendanceSample: { present, scheduled, days: ATTENDANCE_WINDOW_DAYS },
        avgArrival: arrivalValues.length
          ? minutesToHhmm(arrivalValues.reduce((sum, v) => sum + v, 0) / arrivalValues.length)
          : null,
        onSite: roster.filter((row) => row.status === 'ON_SITE' || row.status === 'LATE').length,
        expected: roster.filter((row) => !row.isStandby).length,
        standbyActive: standbyFree,
        slaCoverHours: site.slaCoverHours,
        openCovers: openCovers.length,
        breachedCovers: covers.filter((c) => c.status === CoverRequestStatus.BREACHED).length,
      },
      roster,
      covers: covers.map((cover) => {
        const absent = placements.find((p) => p.id === cover.absentPlacementId);
        const standby = placements.find((p) => p.id === cover.standbyPlacementId);
        return {
          ...cover,
          absentName: absent ? shortName(absent.candidate.fullName) : 'Former crew member',
          standbyName: standby ? shortName(standby.candidate.fullName) : null,
          minutesLeft: Math.round((cover.dueBy.getTime() - now.getTime()) / 60_000),
        };
      }),
      feed,
    };
  }

  async addNote(siteId: string, message: string, actor: AuthUser) {
    await this.requireSite(siteId);
    return this.event(siteId, 'NOTE', message, { actor: 'staff', detail: `Note by ${await this.staffName(actor)}` });
  }

  // ------------------------------------------------------------ the agent

  /** Marks no-shows after the grace period and opens SLA-tracked cover requests. Idempotent per day. */
  async runMuster(siteId: string, trigger: 'agent' | AuthUser = 'agent') {
    const site = await this.requireSite(siteId);
    const now = new Date();
    const clock = siteClock(now, site.timezone);
    const cutoff = hhmmToMinutes(site.shiftStart) + site.graceMinutes;

    if (isSunday(clock.workDate)) return { skipped: 'No muster on Sundays', noShows: 0 };
    if (clock.minutes <= cutoff) {
      return { skipped: `Muster runs after ${minutesToHhmm(cutoff)} ${zoneLabel(site.timezone)}`, noShows: 0 };
    }

    const placements = await this.prisma.placement.findMany({
      where: { siteId, status: PlacementStatus.ACTIVE, startDate: { lte: now } },
      include: { candidate: { select: { fullName: true } } },
    });
    const todayIns = await this.prisma.attendanceEvent.findMany({
      where: { siteId, workDate: clock.workDate, kind: AttendanceKind.CHECK_IN, withinGeofence: true },
      select: { placementId: true },
    });
    const present = new Set(todayIns.map((row) => row.placementId));
    const existingCovers = await this.prisma.coverRequest.findMany({
      where: { siteId, workDate: clock.workDate },
      select: { absentPlacementId: true, standbyPlacementId: true },
    });
    const alreadyOpened = new Set(existingCovers.map((c) => c.absentPlacementId));
    const busyStandby = new Set(existingCovers.map((c) => c.standbyPlacementId).filter(Boolean));
    const freeStandby = placements.filter((p) => p.isStandby && !busyStandby.has(p.id) && !present.has(p.id));

    const crew = placements.filter((p) => !p.isStandby);
    const absent = crew.filter((p) => !present.has(p.id) && !alreadyOpened.has(p.id));

    for (const placement of absent) {
      const suggestion = freeStandby.shift();
      const dueBy = new Date(now.getTime() + site.slaCoverHours * 3_600_000);
      await this.prisma.coverRequest.create({
        data: {
          siteId,
          absentPlacementId: placement.id,
          workDate: clock.workDate,
          reason: `No check-in by ${minutesToHhmm(cutoff)}`,
          dueBy,
        },
      });
      await this.event(siteId, 'NO_SHOW', `${shortName(placement.candidate.fullName)} has not checked in`, {
        severity: 'warn',
        detail: suggestion
          ? `Cover opened · suggested standby: ${shortName(suggestion.candidate.fullName)} · SLA ${site.slaCoverHours}h`
          : `Cover opened · no free standby, recruiter alerted · SLA ${site.slaCoverHours}h`,
        meta: { placementId: placement.id, suggestedStandbyId: suggestion?.id ?? null, workDate: clock.workDate },
      });
    }

    const startOfDay = siteTimeToUtc(clock.workDate, '00:00', site.timezone);
    const alreadySummarised = await this.prisma.opsEvent.findFirst({
      where: { siteId, type: 'MUSTER_CLOSED', createdAt: { gte: startOfDay } },
    });
    if (!alreadySummarised) {
      await this.event(siteId, 'MUSTER_CLOSED', `Morning muster: ${present.size} of ${crew.length} crew on site`, {
        severity: absent.length ? 'warn' : 'success',
        actor: trigger === 'agent' ? 'agent' : 'staff',
        detail: absent.length ? `${absent.length} cover request(s) opened` : 'Full crew confirmed',
      });
    }

    return { noShows: absent.length, onSite: present.size, crew: crew.length };
  }

  async assignCover(coverId: string, standbyPlacementId: string, actor: AuthUser) {
    const cover = await this.prisma.coverRequest.findUnique({ where: { id: coverId } });
    if (!cover) throw new NotFoundException('Cover request not found');
    if (cover.status !== CoverRequestStatus.OPEN && cover.status !== CoverRequestStatus.BREACHED) {
      throw new BadRequestException('This cover is already closed');
    }
    const standby = await this.prisma.placement.findUnique({
      where: { id: standbyPlacementId },
      include: { candidate: { select: { fullName: true } } },
    });
    if (!standby || standby.siteId !== cover.siteId || !standby.isStandby || standby.status !== PlacementStatus.ACTIVE) {
      throw new BadRequestException('Pick an active standby worker from this site');
    }

    const filledAt = new Date();
    const updated = await this.prisma.coverRequest.update({
      where: { id: coverId },
      data: { status: CoverRequestStatus.FILLED, standbyPlacementId, filledAt, filledById: actor.id },
    });
    const minutes = Math.round((filledAt.getTime() - cover.openedAt.getTime()) / 60_000);
    await this.event(cover.siteId, 'COVER_FILLED', `${shortName(standby.candidate.fullName)} sent to cover`, {
      severity: 'success',
      actor: 'staff',
      detail: `Filled in ${minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 60)} h`} by ${await this.staffName(actor)}`,
    });
    return updated;
  }

  /** Periodic agent: run due musters and flag covers that missed their SLA. */
  async sweep() {
    try {
      const sites = await this.prisma.workSite.findMany({ where: { isActive: true } });
      for (const site of sites) {
        await this.runMuster(site.id).catch((error: unknown) =>
          this.logger.warn(`Muster failed for ${site.id}: ${String(error)}`),
        );
      }

      const overdue = await this.prisma.coverRequest.findMany({
        where: { status: CoverRequestStatus.OPEN, dueBy: { lt: new Date() } },
      });
      for (const cover of overdue) {
        await this.prisma.coverRequest.update({ where: { id: cover.id }, data: { status: CoverRequestStatus.BREACHED } });
        await this.event(cover.siteId, 'SLA_BREACHED', 'Cover SLA missed', {
          severity: 'critical',
          detail: 'A cover request passed its deadline. Escalated to operations.',
          meta: { coverId: cover.id },
        });
      }
    } catch (error) {
      this.logger.warn(`Ops sweep failed: ${String(error)}`);
    }
  }

  // ---------------------------------------------------------------- workers

  async myPlacements(user: AuthUser) {
    const candidate = await this.candidates.ensureCandidateForUser(user);
    const placements = await this.prisma.placement.findMany({
      where: { candidateId: candidate.id, status: PlacementStatus.ACTIVE },
      include: { site: true },
      orderBy: { startDate: 'desc' },
    });
    return Promise.all(
      placements.map(async (placement) => {
        const clock = siteClock(new Date(), placement.site.timezone);
        const today = await this.prisma.attendanceEvent.findMany({
          where: { placementId: placement.id, workDate: clock.workDate, withinGeofence: true },
          orderBy: { occurredAt: 'asc' },
        });
        const checkIn = today.find((e) => e.kind === AttendanceKind.CHECK_IN);
        const checkOut = [...today].reverse().find((e) => e.kind === AttendanceKind.CHECK_OUT);
        return {
          placementId: placement.id,
          roleTitle: placement.roleTitle,
          isStandby: placement.isStandby,
          site: this.publicSite(placement.site),
          today: {
            workDate: clock.workDate,
            checkInAt: checkIn?.occurredAt ?? null,
            checkOutAt: checkOut?.occurredAt ?? null,
            lateMinutes: checkIn?.lateMinutes ?? 0,
          },
        };
      }),
    );
  }

  private publicSite(site: WorkSite) {
    return {
      id: site.id,
      name: site.name,
      address: site.address,
      latitude: site.latitude,
      longitude: site.longitude,
      radiusMeters: site.radiusMeters,
      shiftStart: site.shiftStart,
      shiftEnd: site.shiftEnd,
      zone: zoneLabel(site.timezone),
    };
  }

  async recordAttendance(user: AuthUser, input: AttendanceInput, kind: AttendanceKind) {
    const candidate = await this.candidates.ensureCandidateForUser(user);
    const placement = await this.prisma.placement.findUnique({
      where: { id: input.placementId },
      include: { site: true },
    });
    if (!placement || placement.candidateId !== candidate.id || placement.status !== PlacementStatus.ACTIVE) {
      throw new NotFoundException('Placement not found');
    }

    const site = placement.site;
    const now = new Date();
    const clock = siteClock(now, site.timezone);
    const distance = distanceMeters(input.latitude, input.longitude, site.latitude, site.longitude);
    const within = distance <= site.radiusMeters;
    const name = shortName(candidate.fullName);

    const existing = await this.prisma.attendanceEvent.findMany({
      where: { placementId: placement.id, workDate: clock.workDate, withinGeofence: true },
      orderBy: { occurredAt: 'asc' },
    });
    const checkedIn = existing.find((e) => e.kind === AttendanceKind.CHECK_IN);

    if (kind === AttendanceKind.CHECK_IN && checkedIn) {
      return { ok: true, alreadyDone: true, event: checkedIn, distanceMeters: checkedIn.distanceMeters };
    }
    if (kind === AttendanceKind.CHECK_OUT && !checkedIn) {
      throw new BadRequestException('Check in first, then check out at the end of your shift.');
    }

    const shiftStart = hhmmToMinutes(site.shiftStart);
    const lateMinutes =
      kind === AttendanceKind.CHECK_IN && clock.minutes > shiftStart + site.graceMinutes
        ? clock.minutes - shiftStart
        : 0;

    const event = await this.prisma.attendanceEvent.create({
      data: {
        placementId: placement.id,
        siteId: site.id,
        kind,
        workDate: clock.workDate,
        occurredAt: now,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracyMeters: input.accuracyMeters,
        distanceMeters: distance,
        withinGeofence: within,
        lateMinutes,
      },
    });

    if (!within) {
      await this.event(site.id, 'GEOFENCE_REJECTED', `${name} tried to ${kind === AttendanceKind.CHECK_IN ? 'check in' : 'check out'} off site`, {
        severity: 'warn',
        actor: 'worker',
        detail: `${distance}m from the site · fence is ${site.radiusMeters}m`,
      });
      throw new BadRequestException(
        `You are about ${distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance} m`} from ${site.name}. Move within ${site.radiusMeters} m and try again.`,
      );
    }

    const localTime = `${minutesToHhmm(clock.minutes)} ${zoneLabel(site.timezone)}`;
    if (kind === AttendanceKind.CHECK_IN) {
      const openCover = await this.prisma.coverRequest.findFirst({
        where: { absentPlacementId: placement.id, workDate: clock.workDate, status: CoverRequestStatus.OPEN },
      });
      if (openCover) {
        await this.prisma.coverRequest.update({
          where: { id: openCover.id },
          data: { status: CoverRequestStatus.CANCELLED },
        });
      }
      await this.event(
        site.id,
        lateMinutes ? 'LATE_ARRIVAL' : 'CHECK_IN',
        lateMinutes ? `${name} arrived ${lateMinutes} min late` : `${name} checked in`,
        {
          severity: lateMinutes ? 'warn' : 'success',
          actor: 'worker',
          detail: `${localTime} · ${distance}m inside fence${openCover ? ' · open cover closed' : ''}${placement.isStandby ? ' · standby' : ''}`,
        },
      );
    } else {
      await this.event(site.id, 'CHECK_OUT', `${name} checked out`, {
        actor: 'worker',
        detail: localTime,
      });
    }

    return { ok: true, alreadyDone: false, event, distanceMeters: distance, lateMinutes };
  }
}
