import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TrainingCostsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.trainingCost.findMany({
      where: { isActive: true },
      orderBy: { trainingType: 'asc' },
    });
  }

  async findOne(trainingType: string) {
    const cost = await this.prisma.trainingCost.findUnique({
      where: { trainingType },
    });

    if (!cost) {
      throw new NotFoundException(`Training cost for type ${trainingType} not found`);
    }

    return cost;
  }

  async update(trainingType: string, cost: number) {
    const existingCost = await this.prisma.trainingCost.findUnique({
      where: { trainingType },
    });

    if (!existingCost) {
      throw new NotFoundException(`Training cost for type ${trainingType} not found`);
    }

    return this.prisma.trainingCost.update({
      where: { trainingType },
      data: { cost },
    });
  }

  async create(trainingType: string, cost: number) {
    return this.prisma.trainingCost.create({
      data: {
        trainingType,
        cost,
      },
    });
  }

  async delete(trainingType: string) {
    const existingCost = await this.prisma.trainingCost.findUnique({
      where: { trainingType },
    });

    if (!existingCost) {
      throw new NotFoundException(`Training cost for type ${trainingType} not found`);
    }

    return this.prisma.trainingCost.update({
      where: { trainingType },
      data: { isActive: false },
    });
  }
}
