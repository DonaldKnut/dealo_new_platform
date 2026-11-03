import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CandidateDocumentKind, UserRole } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { CandidatesService } from '../candidates/candidates.service';
import { AuditLogService } from '../common/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from './cloudinary.service';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);
const MAX_BYTES = 8 * 1024 * 1024;

@Injectable()
export class TalentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidatesService: CandidatesService,
    private readonly cloudinary: CloudinaryService,
    private readonly auditLog: AuditLogService,
  ) {}

  private assertTalent(user: AuthUser) {
    if (!user.roles.includes(UserRole.TALENT)) {
      throw new ForbiddenException('Talent role required');
    }
  }

  async me(user: AuthUser) {
    this.assertTalent(user);
    const candidate = await this.candidatesService.ensureCandidateForUser(user);
    const documentCount = await this.prisma.candidateDocument.count({
      where: { candidateId: candidate.id },
    });

    return {
      candidate: {
        id: candidate.id,
        fullName: candidate.fullName,
        email: candidate.email,
        phone: candidate.phone,
        roleTitle: candidate.roleTitle,
        location: candidate.location,
        screenStatus: candidate.screenStatus,
      },
      documentCount,
      uploadsConfigured: this.cloudinary.isConfigured(),
    };
  }

  async matches(user: AuthUser) {
    this.assertTalent(user);
    const candidate = await this.candidatesService.ensureCandidateForUser(user);

    const entries = await this.prisma.shortlistEntry.findMany({
      where: { candidateId: candidate.id },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        shortlist: {
          include: {
            hireInquiry: {
              select: {
                id: true,
                companyName: true,
                roleTitle: true,
                status: true,
                location: true,
                roleFamily: true,
                serviceType: true,
              },
            },
          },
        },
      },
    });

    return entries.map((entry) => ({
      id: entry.id,
      rank: entry.rank,
      notes: entry.notes,
      shortlistTitle: entry.shortlist.title,
      inquiry: entry.shortlist.hireInquiry,
      updatedAt: entry.updatedAt,
    }));
  }

  async listDocuments(user: AuthUser) {
    this.assertTalent(user);
    const candidate = await this.candidatesService.ensureCandidateForUser(user);
    return this.prisma.candidateDocument.findMany({
      where: { candidateId: candidate.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async uploadDocument(
    user: AuthUser,
    file: Express.Multer.File | undefined,
    kindRaw?: string,
  ) {
    this.assertTalent(user);
    this.cloudinary.assertConfigured();

    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Only PDF, PNG, JPG, and WebP files are allowed');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('File must be 8MB or smaller');
    }

    const kind = parseKind(kindRaw);
    const candidate = await this.candidatesService.ensureCandidateForUser(user);
    const safeName = file.originalname.replace(/[^\w.\-]+/g, '_').slice(0, 120);
    const publicName = `${candidate.id}-${Date.now()}-${safeName}`;

    const uploaded = await this.cloudinary.uploadBuffer(file.buffer, {
      folder: 'dealo/talent-documents',
      filename: publicName,
      mimeType: file.mimetype,
    });

    const doc = await this.prisma.candidateDocument.create({
      data: {
        candidateId: candidate.id,
        kind,
        fileName: file.originalname.slice(0, 200),
        mimeType: file.mimetype,
        byteSize: file.size,
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
      },
    });

    await this.auditLog.record({
      action: 'TALENT_DOCUMENT_UPLOADED',
      entityType: 'CandidateDocument',
      entityId: doc.id,
      actorId: user.id,
      metadata: { kind: doc.kind, mimeType: doc.mimeType },
    });

    return doc;
  }

  async deleteDocument(user: AuthUser, id: string) {
    this.assertTalent(user);
    const candidate = await this.candidatesService.ensureCandidateForUser(user);
    const doc = await this.prisma.candidateDocument.findUnique({ where: { id } });
    if (!doc || doc.candidateId !== candidate.id) {
      throw new NotFoundException('Document not found');
    }

    try {
      await this.cloudinary.destroy(doc.publicId, doc.mimeType);
    } catch {
      // still remove DB row if Cloudinary delete fails (orphan cleanup later)
    }

    await this.prisma.candidateDocument.delete({ where: { id } });
    await this.auditLog.record({
      action: 'TALENT_DOCUMENT_DELETED',
      entityType: 'CandidateDocument',
      entityId: id,
      actorId: user.id,
    });

    return { ok: true };
  }
}

function parseKind(value?: string): CandidateDocumentKind {
  const normalized = (value ?? 'OTHER').toUpperCase();
  if (normalized === 'CV' || normalized === 'CERTIFICATE' || normalized === 'OTHER') {
    return normalized;
  }
  throw new BadRequestException('Invalid document kind');
}
