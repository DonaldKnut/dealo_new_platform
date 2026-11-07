import { Injectable } from '@nestjs/common';
import type { User, UserRole } from '@prisma/client';

import { normalizeEmail } from '../common/normalize-email';
import { PrismaService } from '../prisma/prisma.service';

export type UserWithAccess = User & {
  roles: UserRole[];
  permissions: string[];
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserWithAccess | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return this.mapUser(user);
  }

  async findById(id: string): Promise<UserWithAccess | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return this.mapUser(user);
  }

  async findByGoogleId(googleId: string): Promise<UserWithAccess | null> {
    return this.findByProviderId({ googleId });
  }

  async findByLinkedinId(linkedinId: string): Promise<UserWithAccess | null> {
    return this.findByProviderId({ linkedinId });
  }

  private async findByProviderId(where: { googleId: string } | { linkedinId: string }): Promise<UserWithAccess | null> {
    const user = await this.prisma.user.findFirst({
      where,
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return this.mapUser(user);
  }

  private mapUser(
    user: User & {
      roles: Array<{
        role: {
          code: UserRole;
          permissions: Array<{ permission: { code: string } }>;
        };
      }>;
    },
  ): UserWithAccess {
    const roles = user.roles.map((assignment) => assignment.role.code);
    const permissions = [
      ...new Set(
        user.roles.flatMap((assignment) =>
          assignment.role.permissions.map((item) => item.permission.code),
        ),
      ),
    ];

    return {
      ...user,
      roles,
      permissions,
    };
  }
}
