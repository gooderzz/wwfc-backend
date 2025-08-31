import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TrialistsService {
  constructor(private prisma: PrismaService) {}

  async getAllTrialists() {
    return this.prisma.user.findMany({
      where: {
        role: 'TRIALIST',
        status: 'ACTIVE',
      },
      include: {
        primaryPosition: true,
        secondaryPosition: true,
        team: true,
        trialistRatings: {
          include: {
            manager: {
              select: {
                id: true,
                name: true,
                team: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getTrialistById(id: number) {
    const trialist = await this.prisma.user.findUnique({
      where: { id },
      include: {
        primaryPosition: true,
        secondaryPosition: true,
        team: true,
        trialistRatings: {
          include: {
            manager: {
              select: {
                id: true,
                name: true,
                team: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        playerStats: {
          include: {
            fixture: {
              select: {
                id: true,
                opponent: true,
                date: true,
                team: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!trialist) {
      throw new NotFoundException('Trialist not found');
    }

    return trialist;
  }

  async rateTrialist(trialistId: number, managerId: number, rating: number, interested: boolean, notes?: string) {
    // Validate rating
    if (rating < 1 || rating > 10) {
      throw new ForbiddenException('Rating must be between 1 and 10');
    }

    // Check if trialist exists and is a trialist
    const trialist = await this.prisma.user.findUnique({
      where: { id: trialistId },
    });

    if (!trialist || trialist.role !== 'TRIALIST') {
      throw new NotFoundException('Trialist not found');
    }

    // Check if manager exists and is a manager
    const manager = await this.prisma.user.findUnique({
      where: { id: managerId },
    });

    if (!manager || (manager.role !== 'MANAGER' && manager.role !== 'ADMIN')) {
      throw new ForbiddenException('Only managers can rate trialists');
    }

    // Upsert the rating
    return this.prisma.trialistRating.upsert({
      where: {
        trialistId_managerId: {
          trialistId,
          managerId,
        },
      },
      update: {
        rating,
        interested,
        notes,
        updatedAt: new Date(),
      },
      create: {
        trialistId,
        managerId,
        rating,
        interested,
        notes,
      },
    });
  }

  async updateTrialistStatus(trialistId: number, status: 'ACTIVE' | 'REJECTED' | 'PROMOTED', teamId?: number) {
    const trialist = await this.prisma.user.findUnique({
      where: { id: trialistId },
    });

    if (!trialist || trialist.role !== 'TRIALIST') {
      throw new NotFoundException('Trialist not found');
    }

    const updateData: any = { status };

    if (status === 'PROMOTED' && teamId) {
      updateData.role = 'PLAYER';
      updateData.teamId = teamId;
    }

    return this.prisma.user.update({
      where: { id: trialistId },
      data: updateData,
    });
  }

  async getTrialistsByPosition(positionId: number) {
    return this.prisma.user.findMany({
      where: {
        role: 'TRIALIST',
        status: 'ACTIVE',
        OR: [
          { primaryPositionId: positionId },
          { secondaryPositionId: positionId },
        ],
      },
      include: {
        primaryPosition: true,
        secondaryPosition: true,
        team: true,
        trialistRatings: {
          include: {
            manager: {
              select: {
                id: true,
                name: true,
                team: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getTrialistStats() {
    const trialists = await this.prisma.user.findMany({
      where: {
        role: 'TRIALIST',
      },
      include: {
        primaryPosition: true,
        secondaryPosition: true,
        team: true,
        trialistRatings: true,
      },
    });

    const stats = {
      total: trialists.length,
      active: trialists.filter(t => t.status === 'ACTIVE').length,
      promoted: trialists.filter(t => t.status === 'PROMOTED').length,
      rejected: trialists.filter(t => t.status === 'REJECTED').length,
      byPosition: {} as Record<string, number>,
      averageRating: 0,
    };

    // Count by position
    trialists.forEach(trialist => {
      const position = trialist.primaryPosition?.name || 'Unknown';
      stats.byPosition[position] = (stats.byPosition[position] || 0) + 1;
    });

    // Calculate average rating
    const allRatings = trialists.flatMap(t => t.trialistRatings.map(r => r.rating));
    if (allRatings.length > 0) {
      stats.averageRating = allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length;
    }

    return stats;
  }
}
