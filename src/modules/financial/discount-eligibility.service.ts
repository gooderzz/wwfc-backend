import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateDiscountEligibilityDto, UpdateDiscountEligibilityDto } from './dto/discount-eligibility.dto';
import { DiscountType } from '@prisma/client';

@Injectable()
export class DiscountEligibilityService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userId: number) {
    return this.prisma.discountEligibility.findMany({
      where: { 
        userId,
        isActive: true 
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        verifiedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const discountEligibility = await this.prisma.discountEligibility.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        verifiedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!discountEligibility) {
      throw new NotFoundException(`Discount eligibility with ID ${id} not found`);
    }

    return discountEligibility;
  }

  async create(userId: number, createDiscountEligibilityDto: CreateDiscountEligibilityDto, verifiedBy: number) {
    // Check if user already has an active discount of this type
    const existingDiscount = await this.prisma.discountEligibility.findFirst({
      where: {
        userId,
        discountType: createDiscountEligibilityDto.discountType,
        isActive: true,
      },
    });

    if (existingDiscount) {
      throw new ConflictException(`User already has an active ${createDiscountEligibilityDto.discountType} discount`);
    }

    return this.prisma.discountEligibility.create({
      data: {
        userId,
        discountType: createDiscountEligibilityDto.discountType,
        isActive: createDiscountEligibilityDto.isActive ?? true,
        startDate: new Date(),
        endDate: createDiscountEligibilityDto.endDate ? new Date(createDiscountEligibilityDto.endDate) : null,
        verifiedBy,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        verifiedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async update(id: string, updateDiscountEligibilityDto: UpdateDiscountEligibilityDto) {
    const existingDiscount = await this.prisma.discountEligibility.findUnique({
      where: { id },
    });

    if (!existingDiscount) {
      throw new NotFoundException(`Discount eligibility with ID ${id} not found`);
    }

    return this.prisma.discountEligibility.update({
      where: { id },
      data: {
        isActive: updateDiscountEligibilityDto.isActive,
        endDate: updateDiscountEligibilityDto.endDate ? new Date(updateDiscountEligibilityDto.endDate) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        verifiedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    const existingDiscount = await this.prisma.discountEligibility.findUnique({
      where: { id },
    });

    if (!existingDiscount) {
      throw new NotFoundException(`Discount eligibility with ID ${id} not found`);
    }

    return this.prisma.discountEligibility.update({
      where: { id },
      data: { isActive: false },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        verifiedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async isEligibleForDiscount(userId: number, discountType: DiscountType): Promise<boolean> {
    const activeDiscount = await this.prisma.discountEligibility.findFirst({
      where: {
        userId,
        discountType,
        isActive: true,
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } },
        ],
      },
    });

    return !!activeDiscount;
  }

  async getActiveDiscounts(userId: number) {
    return this.prisma.discountEligibility.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } },
        ],
      },
      include: {
        verifiedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getExpiredDiscounts(userId: number) {
    return this.prisma.discountEligibility.findMany({
      where: {
        userId,
        isActive: true,
        endDate: {
          lt: new Date(),
        },
      },
      include: {
        verifiedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { endDate: 'desc' },
    });
  }

  async deactivateExpiredDiscounts() {
    return this.prisma.discountEligibility.updateMany({
      where: {
        isActive: true,
        endDate: {
          lt: new Date(),
        },
      },
      data: {
        isActive: false,
      },
    });
  }
}
