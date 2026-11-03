import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type {
  SupportTicketCreateInput,
  SupportTicketReplyInput,
  SupportTicketStatusInput,
} from '@dealo/shared';

import type { AuthUser } from '../auth/auth.types';
import { AuditLogService } from '../common/audit-log.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

const STAFF_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.RECRUITER,
  UserRole.OPERATIONS,
];

function isStaff(user: AuthUser) {
  return user.roles.some((role) => STAFF_ROLES.includes(role));
}

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(input: SupportTicketCreateInput, user: AuthUser) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        subject: input.subject,
        body: input.body,
        priority: input.priority,
        category: input.category,
        requesterId: user.id,
        messages: {
          create: {
            authorId: user.id,
            body: input.body,
            internal: false,
          },
        },
      },
      include: {
        requester: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        messages: true,
      },
    });

    await this.auditLog.record({
      action: 'SUPPORT_TICKET_CREATED',
      entityType: 'SupportTicket',
      entityId: ticket.id,
      actorId: user.id,
      metadata: { subject: ticket.subject, priority: ticket.priority },
    });

    await this.notifyAdmins(ticket);

    return ticket;
  }

  async list(user: AuthUser) {
    if (isStaff(user)) {
      return this.prisma.supportTicket.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          requester: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          assignee: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          _count: { select: { messages: true } },
        },
      });
    }

    return this.prisma.supportTicket.findMany({
      where: { requesterId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        _count: { select: { messages: true } },
      },
    });
  }

  async getOne(id: string, user: AuthUser) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        requester: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!isStaff(user) && ticket.requesterId !== user.id) {
      throw new ForbiddenException('Not allowed to view this ticket');
    }

    const messages = isStaff(user)
      ? ticket.messages
      : ticket.messages.filter((message) => !message.internal);

    return { ...ticket, messages };
  }

  async reply(id: string, input: SupportTicketReplyInput, user: AuthUser) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const staff = isStaff(user);
    if (!staff && ticket.requesterId !== user.id) {
      throw new ForbiddenException('Not allowed to reply');
    }
    if (!staff && input.internal) {
      throw new ForbiddenException('Internal notes are staff-only');
    }

    const message = await this.prisma.supportTicketMessage.create({
      data: {
        ticketId: id,
        authorId: user.id,
        body: input.body,
        internal: staff ? Boolean(input.internal) : false,
      },
    });

    await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: staff ? 'IN_PROGRESS' : 'WAITING_ON_USER',
        updatedAt: new Date(),
      },
    });

    await this.auditLog.record({
      action: 'SUPPORT_TICKET_REPLY',
      entityType: 'SupportTicket',
      entityId: id,
      actorId: user.id,
      metadata: { internal: message.internal },
    });

    return message;
  }

  async updateStatus(id: string, input: SupportTicketStatusInput, user: AuthUser) {
    if (!isStaff(user)) throw new ForbiddenException('Staff only');

    const ticket = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: input.status,
        resolvedAt:
          input.status === 'RESOLVED' || input.status === 'CLOSED'
            ? new Date()
            : null,
        assigneeId: user.id,
      },
    });

    await this.auditLog.record({
      action: 'SUPPORT_TICKET_STATUS',
      entityType: 'SupportTicket',
      entityId: id,
      actorId: user.id,
      metadata: { status: input.status },
    });

    return ticket;
  }

  private async notifyAdmins(ticket: {
    id: string;
    subject: string;
    body: string;
    priority: string;
    requester: { email: string; firstName: string; lastName: string };
  }) {
    const adminRoles = await this.prisma.userRoleAssignment.findMany({
      where: {
        role: { code: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN] } },
      },
      include: { user: { select: { email: true, firstName: true } } },
      take: 40,
    });

    const emails = [
      ...new Set(
        adminRoles
          .map((row) => row.user.email)
          .filter((email): email is string => Boolean(email)),
      ),
    ];

    const requesterName =
      `${ticket.requester.firstName} ${ticket.requester.lastName}`.trim() ||
      ticket.requester.email;

    await Promise.all(
      emails.map((to) =>
        this.emailService.send({
          to,
          subject: `[Dealo Support] ${ticket.priority}: ${ticket.subject}`,
          html: `<p>New support ticket from <strong>${requesterName}</strong> (${ticket.requester.email}).</p>
<p><strong>Subject:</strong> ${ticket.subject}</p>
<p><strong>Priority:</strong> ${ticket.priority}</p>
<p>${ticket.body.replace(/\n/g, '<br/>')}</p>
<p>Ticket ID: ${ticket.id}</p>`,
          text: `New support ticket from ${requesterName}. Subject: ${ticket.subject}. Priority: ${ticket.priority}. ${ticket.body}`,
        }),
      ),
    );
  }
}
