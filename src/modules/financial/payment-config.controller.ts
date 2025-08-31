import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PaymentConfigService } from './payment-config.service';
import { CreatePaymentConfigDto, UpdatePaymentConfigDto } from './dto/payment-config.dto';
import { PaymentType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('payment-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentConfigController {
  constructor(private readonly paymentConfigService: PaymentConfigService) {}

  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.paymentConfigService.findAll();
  }

  @Get(':type')
  @Roles('ADMIN')
  findByType(@Param('type') type: PaymentType) {
    return this.paymentConfigService.findByType(type);
  }

  @Get(':type/current')
  @Roles('ADMIN')
  getCurrentConfig(@Param('type') type: PaymentType) {
    return this.paymentConfigService.getCurrentConfig(type);
  }

  @Get(':type/:season')
  @Roles('ADMIN')
  findByTypeAndSeason(
    @Param('type') type: PaymentType,
    @Param('season') season: string,
  ) {
    // For backward compatibility, just return the current config
    return this.paymentConfigService.findByType(type);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() createPaymentConfigDto: CreatePaymentConfigDto) {
    return this.paymentConfigService.create(createPaymentConfigDto);
  }

  @Put(':type/:season')
  @Roles('ADMIN')
  update(
    @Param('type') type: PaymentType,
    @Param('season') season: string,
    @Body() updatePaymentConfigDto: UpdatePaymentConfigDto,
  ) {
    return this.paymentConfigService.update(type, season, updatePaymentConfigDto);
  }

  @Delete(':type/:season')
  @Roles('ADMIN')
  delete(
    @Param('type') type: PaymentType,
    @Param('season') season: string,
  ) {
    return this.paymentConfigService.delete(type, season);
  }
}
