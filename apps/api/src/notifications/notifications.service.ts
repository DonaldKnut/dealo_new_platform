import { Injectable, Logger, NotFoundException, type MessageEvent } from '@nestjs/common';
import { UserRole, type Notification } from '@prisma/client';
import { filter, interval, map, merge, of, Subject, type Observable } from 'rxjs';

import { normalizeEmail } from '../common/normalize-email';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationInput = {
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
};

type FeedItem = { userId: string; notification: PublicNotification | null };
export type PublicNotification = Pick<
  Notification,
  'id' | 'type' | 'title' | 'body' | 'link' | 'readAt' | 'createdAt'
>;

const STAFF_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.RECRUITER,
  UserRole.OPERATIONS,
];
/** Above this many recipients rows are written in one batch and open tabs are told to refetch. */
const BATCH_THRESHOLD = 40;
/** Keeps proxies from closing an idle stream. */
const HEARTBEAT_MS = 25_000;
/** In MongoDB an optional field that was never set is missing, not null. */
const UNREAD = { OR: [{ readAt: null }, { readAt: { isSet: false } }] };

const toPublic = (n: Notification): PublicNotification => ({
  id: n.id,
  type: n.type,
  title: n.title,
  body: n.body,
  link: n.link,
  readAt: n.readAt,
  createdAt: n.createdAt,
});

/**
 * In-app notifications. Rows are stored so people see what they missed; open dashboards also get
 * each one instantly over a server-sent event stream. The live feed is in-process, which is right
 * for a single API instance; several instances would need a shared channel (e.g. Redis) here.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly feed = new Subject<FeedItem>();

  constructor(private readonly prisma: PrismaService) {}

  /** Never throws: a notification failing must not break the action that caused it. */
  async notify(userIds: Array<string | null | undefined>, input: NotificationInput): Promise<void> {
    const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
    if (!ids.length) return;
    const data = {
      type: input.type,
      title: input.title.slice(0, 200),
      body: input.body?.slice(0, 500) ?? null,
      link: input.link ?? null,
    };
    try {
      if (ids.length > BATCH_THRESHOLD) {
        await this.prisma.notification.createMany({
          data: ids.map((userId) => ({ userId, ...data })),
        });
        ids.forEach((userId) => this.feed.next({ userId, notification: null }));
        return;
      }
      const rows = await Promise.all(
        ids.map((userId) => this.prisma.notification.create({ data: { userId, ...data } })),
      );
      rows.forEach((row) => this.feed.next({ userId: row.userId, notification: toPublic(row) }));
    } catch (error) {
      this.logger.warn(
        `Could not save "${input.type}" notification: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async notifyStaff(input: NotificationInput, exceptUserId?: string) {
    const rows = await this.prisma.userRoleAssignment
      .findMany({
        where: { role: { code: { in: STAFF_ROLES } }, user: { isActive: true } },
        select: { userId: true },
      })
      .catch(() => []);
    await this.notify(
      rows.map((r) => r.userId).filter((id) => id !== exceptUserId),
      input,
    );
  }

  async notifyEmails(emails: string[], input: NotificationInput) {
    const list = [...new Set(emails.map(normalizeEmail))];
    if (!list.length) return;
    const users = await this.prisma.user
      .findMany({ where: { email: { in: list }, isActive: true }, select: { id: true } })
      .catch(() => []);
    await this.notify(
      users.map((u) => u.id),
      input,
    );
  }

  async notifyOrganization(
    organizationId: string,
    input: NotificationInput,
    exceptUserId?: string,
  ) {
    const members = await this.prisma.organizationMember
      .findMany({ where: { organizationId }, select: { userId: true } })
      .catch(() => []);
    await this.notify(
      members.map((m) => m.userId).filter((id) => id !== exceptUserId),
      input,
    );
  }

  async list(userId: string, options: { limit?: number; before?: string } = {}) {
    const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
    const before = options.before ? new Date(options.before) : null;
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: {
          userId,
          ...(before && !Number.isNaN(before.getTime()) ? { createdAt: { lt: before } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
      }),
      this.unreadCount(userId),
    ]);
    return { items: items.slice(0, limit).map(toPublic), unread, hasMore: items.length > limit };
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, ...UNREAD } });
  }

  async markRead(userId: string, id: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    if (!count) throw new NotFoundException('Notification not found');
    return { unread: await this.unreadCount(userId) };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, ...UNREAD },
      data: { readAt: new Date() },
    });
    return { unread: 0 };
  }

  stream(userId: string): Observable<MessageEvent> {
    const updates = this.feed.pipe(
      filter((item) => item.userId === userId),
      map((item): MessageEvent =>
        item.notification
          ? { type: 'notification', data: item.notification }
          : { type: 'sync', data: {} },
      ),
    );
    const heartbeat = interval(HEARTBEAT_MS).pipe(
      map((): MessageEvent => ({ type: 'ping', data: {} })),
    );
    return merge(of<MessageEvent>({ type: 'ready', data: {}, retry: 5_000 }), updates, heartbeat);
  }
}
