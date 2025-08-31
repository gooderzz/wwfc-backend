import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreatePaymentConfigDto, UpdatePaymentConfigDto } from './dto/payment-config.dto';
import { PaymentType } from '@prisma/client';

@Injectable()
export class PaymentConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.paymentConfig.findMany({
      where: { isActive: true },
      orderBy: { paymentType: 'asc' },
    });
  }

  async findByType(paymentType: PaymentType) {
    const config = await this.prisma.paymentConfig.findUnique({
      where: { 
        paymentType,
        isActive: true 
      },
    });

    if (!config) {
      throw new NotFoundException(`Payment config for type ${paymentType} not found`);
    }

    return config;
  }

  async findByTypeAndSeason(paymentType: PaymentType, season: string) {
    // For backward compatibility, just return the current config
    return this.findByType(paymentType);
  }

  async create(createPaymentConfigDto: CreatePaymentConfigDto) {
    try {
      return await this.prisma.paymentConfig.create({
        data: {
          paymentType: createPaymentConfigDto.paymentType,
          amount: createPaymentConfigDto.amount,
          isActive: createPaymentConfigDto.isActive ?? true,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(`Payment config for type ${createPaymentConfigDto.paymentType} already exists`);
      }
      throw error;
    }
  }

  async update(paymentType: PaymentType, season: string, updatePaymentConfigDto: UpdatePaymentConfigDto) {
    const existingConfig = await this.prisma.paymentConfig.findUnique({
      where: { paymentType },
    });

    if (!existingConfig) {
      throw new NotFoundException(`Payment config for type ${paymentType} not found`);
    }

    return this.prisma.paymentConfig.update({
      where: { paymentType },
      data: {
        amount: updatePaymentConfigDto.amount,
        isActive: updatePaymentConfigDto.isActive,
      },
    });
  }

  async delete(paymentType: PaymentType, season: string) {
    const existingConfig = await this.prisma.paymentConfig.findUnique({
      where: { paymentType },
    });

    if (!existingConfig) {
      throw new NotFoundException(`Payment config for type ${paymentType} not found`);
    }

    return this.prisma.paymentConfig.update({
      where: { paymentType },
      data: { isActive: false },
    });
  }

  async getCurrentConfig(paymentType: PaymentType) {
    const config = await this.prisma.paymentConfig.findUnique({
      where: { 
        paymentType,
        isActive: true 
      },
    });

    if (!config) {
      throw new NotFoundException(`No active payment config found for type ${paymentType}`);
    }

    return config;
  }
}
