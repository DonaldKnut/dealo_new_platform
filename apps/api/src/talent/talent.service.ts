import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TalentProfileInput } from '@dealo/shared';
import {
  CandidateDocumentKind,
  Prisma,
  RoleFamily,
  UserRole,
  type Candidate,
} from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { CandidatesService } from '../candidates/candidates.service';
import { AuditLogService } from '../common/audit-log.service';
import type { AppEnv } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { verifiedMime } from '../common/file-signature';
import { CloudinaryService } from './cloudinary.service';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/webp',
]);
const MAX_BYTES = 8 * 1024 * 1024;

const STAFF_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.RECRUITER,
  UserRole.OPERATIONS,
];

const PROFILE_FIELDS = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  roleTitle: true,
  roleFamily: true,
  location: true,
  headline: true,
  bio: true,
  skills: true,
  yearsExperience: true,
  availability: true,
  expectedPayMinor: true,
  linkedinUrl: true,
  portfolioUrl: true,
  openToWork: true,
  screenStatus: true,
  profileUpdatedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CandidateSelect;

const DOCUMENT_FIELDS = {
  id: true,
  kind: true,
  fileName: true,
  mimeType: true,
  byteSize: true,
  url: true,
  storage: true,
  createdAt: true,
} satisfies Prisma.CandidateDocumentSelect;

/** Share of the profile a recruiter needs, as a 0–100 score with what is missing. */
function profileCompleteness(
  candidate: Pick<
    Candidate,
    'fullName' | 'phone' | 'roleTitle' | 'location' | 'headline' | 'bio' | 'skills' | 'yearsExperience' | 'availability'
  >,
  hasCv: boolean,
) {
  const checks: [string, boolean][] = [
    ['Name', Boolean(candidate.fullName)],
    ['Phone', Boolean(candidate.phone)],
    ['Job title', Boolean(candidate.roleTitle)],
    ['Location', Boolean(candidate.location)],
    ['Headline', Boolean(candidate.headline)],
    ['About you', Boolean(candidate.bio && candidate.bio.length >= 40)],
    ['3+ skills', candidate.skills.length >= 3],
    ['Years of experience', candidate.yearsExperience !== null && candidate.yearsExperience !== undefined],
    ['Availability', Boolean(candidate.availability)],
    ['CV uploaded', hasCv],
  ];
  const done = checks.filter(([, ok]) => ok).length;
  return {
    score: Math.round((done / checks.length) * 100),
    missing: checks.filter(([, ok]) => !ok).map(([label]) => label),
  };
}

@Injectable()
export class TalentService {
  private readonly apiUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly candidatesService: CandidatesService,
    private readonly cloudinary: CloudinaryService,
    private readonly auditLog: AuditLogService,
    config: ConfigService<AppEnv, true>,
  ) {
    this.apiUrl = config.get('API_URL', { infer: true }).replace(/\/$/, '');
  }

  private assertTalent(user: AuthUser) {
    if (!user.roles.includes(UserRole.TALENT)) {
      throw new ForbiddenException('Talent role required');
    }
  }

  // --------------------------------------------------------------- profile

  async me(user: AuthUser) {
    this.assertTalent(user);
    const base = await this.candidatesService.ensureCandidateForUser(user);
    const [candidate, documentCount, cvCount] = await Promise.all([
      this.prisma.candidate.findUniqueOrThrow({ where: { id: base.id }, select: PROFILE_FIELDS }),
      this.prisma.candidateDocument.count({ where: { candidateId: base.id } }),
      this.prisma.candidateDocument.count({
        where: { candidateId: base.id, kind: CandidateDocumentKind.CV },
      }),
    ]);

    return {
      candidate,
      documentCount,
      hasCv: cvCount > 0,
      completeness: profileCompleteness(candidate, cvCount > 0),
      uploadsConfigured: true,
    };
  }

  async updateProfile(user: AuthUser, input: TalentProfileInput) {
    this.assertTalent(user);
    const base = await this.candidatesService.ensureCandidateForUser(user);
    const skills = [...new Set(input.skills.map((skill) => skill.trim()).filter(Boolean))].slice(0, 20);

    const candidate = await this.prisma.candidate.update({
      where: { id: base.id },
      data: {
        fullName: input.fullName,
        phone: input.phone || null,
        roleTitle: input.roleTitle,
        roleFamily: input.roleFamily as RoleFamily,
        location: input.location,
        headline: input.headline || null,
        bio: input.bio || null,
        skills,
        yearsExperience: input.yearsExperience ?? null,
        availability: input.availability ?? null,
        expectedPayMinor: input.expectedPayMinor ?? null,
        linkedinUrl: input.linkedinUrl ?? null,
        portfolioUrl: input.portfolioUrl ?? null,
        openToWork: input.openToWork,
        profileUpdatedAt: new Date(),
      },
      select: PROFILE_FIELDS,
    });

    await this.auditLog.record({
      action: 'TALENT_PROFILE_UPDATED',
      entityType: 'Candidate',
      entityId: candidate.id,
      actorId: user.id,
    });

    const hasCv =
      (await this.prisma.candidateDocument.count({
        where: { candidateId: candidate.id, kind: CandidateDocumentKind.CV },
      })) > 0;
    return { candidate, hasCv, completeness: profileCompleteness(candidate, hasCv) };
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

  // ------------------------------------------------------------- documents

  async listDocuments(user: AuthUser) {
    this.assertTalent(user);
    const candidate = await this.candidatesService.ensureCandidateForUser(user);
    return this.prisma.candidateDocument.findMany({
      where: { candidateId: candidate.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: DOCUMENT_FIELDS,
    });
  }

  async uploadDocument(user: AuthUser, file: Express.Multer.File | undefined, kindRaw?: string) {
    this.assertTalent(user);

    if (!file) {
      throw new BadRequestException('Please choose a file');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('File must be 8MB or smaller');
    }
    const mimeType = verifiedMime(file.buffer, ALLOWED_MIME);
    if (!mimeType) {
      throw new BadRequestException('Use a PDF, Word file, or a photo (PNG, JPG, WebP)');
    }

    const kind = parseKind(kindRaw);
    const candidate = await this.candidatesService.ensureCandidateForUser(user);
    const fileName = file.originalname.slice(0, 200);

    let doc;
    if (this.cloudinary.isConfigured()) {
      const safeName = file.originalname.replace(/[^\w.\-]+/g, '_').slice(0, 120);
      const uploaded = await this.cloudinary.uploadBuffer(file.buffer, {
        folder: 'dealo/talent-documents',
        filename: `${candidate.id}-${Date.now()}-${safeName}`,
        mimeType,
      });
      doc = await this.prisma.candidateDocument.create({
        data: {
          candidateId: candidate.id,
          kind,
          fileName,
          mimeType,
          byteSize: file.size,
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          storage: 'cloudinary',
        },
        select: DOCUMENT_FIELDS,
      });
    } else {
      const created = await this.prisma.candidateDocument.create({
        data: {
          candidateId: candidate.id,
          kind,
          fileName,
          mimeType,
          byteSize: file.size,
          url: '',
          publicId: '',
          storage: 'database',
          blob: { create: { data: new Uint8Array(file.buffer) } },
        },
      });
      doc = await this.prisma.candidateDocument.update({
        where: { id: created.id },
        data: { url: `${this.apiUrl}/api/v1/files/candidate-documents/${created.id}` },
        select: DOCUMENT_FIELDS,
      });
    }

    await this.auditLog.record({
      action: 'TALENT_DOCUMENT_UPLOADED',
      entityType: 'CandidateDocument',
      entityId: doc.id,
      actorId: user.id,
      metadata: { kind: doc.kind, mimeType: doc.mimeType, storage: doc.storage },
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

    if (doc.storage === 'database') {
      await this.prisma.candidateDocumentBlob.deleteMany({ where: { documentId: id } });
    } else {
      try {
        await this.cloudinary.destroy(doc.publicId, doc.mimeType);
      } catch {
        // still remove DB row if Cloudinary delete fails (orphan cleanup later)
      }
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

  /** Database-stored file bytes for the owner or Dealo staff. */
  async readStoredFile(user: AuthUser, documentId: string) {
    const doc = await this.prisma.candidateDocument.findUnique({
      where: { id: documentId },
      include: { blob: true, candidate: { select: { userId: true } } },
    });
    if (!doc || doc.storage !== 'database' || !doc.blob) {
      throw new NotFoundException('File not found');
    }
    const isOwner = doc.candidate.userId === user.id;
    const isStaff = user.roles.some((role) => STAFF_ROLES.includes(role));
    if (!isOwner && !isStaff) {
      throw new NotFoundException('File not found');
    }
    return { fileName: doc.fileName, mimeType: doc.mimeType, data: Buffer.from(doc.blob.data) };
  }

  // ------------------------------------------------------------ staff view

  async listProfiles(query: {
    search?: string;
    roleFamily?: string;
    hasCv?: string;
    openToWork?: string;
  }) {
    const where: Prisma.CandidateWhereInput = { userId: { not: null } };
    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { roleTitle: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { skills: { has: search } },
      ];
    }
    if (query.roleFamily === RoleFamily.OFFICE_PROFESSIONAL || query.roleFamily === RoleFamily.SKILLED_TRADE) {
      where.roleFamily = query.roleFamily;
    }
    if (query.openToWork === 'true') where.openToWork = true;
    if (query.hasCv === 'true') where.documents = { some: { kind: CandidateDocumentKind.CV } };

    const rows = await this.prisma.candidate.findMany({
      where,
      orderBy: [{ profileUpdatedAt: 'desc' }, { updatedAt: 'desc' }],
      take: 200,
      select: {
        ...PROFILE_FIELDS,
        documents: { select: DOCUMENT_FIELDS, orderBy: { createdAt: 'desc' } },
      },
    });

    return rows.map(({ documents, ...candidate }) => {
      const cv = documents.find((doc) => doc.kind === CandidateDocumentKind.CV) ?? null;
      return {
        ...candidate,
        cv,
        documentCount: documents.length,
        completeness: profileCompleteness(candidate, Boolean(cv)),
      };
    });
  }

  async getProfile(candidateId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        ...PROFILE_FIELDS,
        notes: true,
        documents: { select: DOCUMENT_FIELDS, orderBy: { createdAt: 'desc' } },
        shortlistEntries: {
          select: {
            id: true,
            rank: true,
            shortlist: { select: { title: true, hireInquiry: { select: { companyName: true, roleTitle: true } } } },
          },
        },
      },
    });
    if (!candidate) throw new NotFoundException('Profile not found');
    const hasCv = candidate.documents.some((doc) => doc.kind === CandidateDocumentKind.CV);
    return { ...candidate, completeness: profileCompleteness(candidate, hasCv) };
  }
}

function parseKind(value?: string): CandidateDocumentKind {
  const normalized = (value ?? 'OTHER').toUpperCase();
  if (normalized === 'CV' || normalized === 'CERTIFICATE' || normalized === 'OTHER') {
    return normalized;
  }
  throw new BadRequestException('Invalid document kind');
}
