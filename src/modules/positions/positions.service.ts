import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class PositionsService {
  constructor(private prisma: PrismaService) {}

  async getAllPositions() {
    return this.prisma.position.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getPositionById(id: number) {
    return this.prisma.position.findUnique({
      where: { id },
    });
  }

  async createPosition(name: string, description?: string) {
    return this.prisma.position.create({
      data: {
        name,
        description,
      },
    });
  }

  async updatePosition(id: number, data: { name?: string; description?: string }) {
    return this.prisma.position.update({
      where: { id },
      data,
    });
  }

  async deletePosition(id: number) {
    // Check if position is being used
    const usersWithPosition = await this.prisma.user.findMany({
      where: {
        OR: [
          { primaryPositionId: id },
          { secondaryPositionId: id },
        ],
      },
    });

    if (usersWithPosition.length > 0) {
      throw new Error('Cannot delete position that is assigned to users');
    }

    return this.prisma.position.delete({
      where: { id },
    });
  }
}
