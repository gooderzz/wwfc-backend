import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { DiscountEligibilityService } from './discount-eligibility.service';
import { CreateDiscountEligibilityDto, UpdateDiscountEligibilityDto } from './dto/discount-eligibility.dto';
import { DiscountType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DiscountEligibilityController {
  constructor(private readonly discountEligibilityService: DiscountEligibilityService) {}

  @Get(':id/discounts')
  @Roles('ADMIN', 'MANAGER', 'PLAYER')
  async findByUser(@Param('id') id: string, @Request() req?: any) {
    const userId = parseInt(id);

    // Players can only see their own discounts
    if (req.user.role === 'PLAYER' && req.user.sub !== userId) {
      throw new Error('Access denied: You can only view your own discounts');
    }

    return this.discountEligibilityService.findByUser(userId);
  }

  @Get(':id/discounts/active')
  @Roles('ADMIN', 'MANAGER', 'PLAYER')
  async getActiveDiscounts(@Param('id') id: string, @Request() req?: any) {
    const userId = parseInt(id);

    // Players can only see their own discounts
    if (req.user.role === 'PLAYER' && req.user.sub !== userId) {
      throw new Error('Access denied: You can only view your own discounts');
    }

    return this.discountEligibilityService.getActiveDiscounts(userId);
  }

  @Get(':id/discounts/expired')
  @Roles('ADMIN', 'MANAGER', 'PLAYER')
  async getExpiredDiscounts(@Param('id') id: string, @Request() req?: any) {
    const userId = parseInt(id);

    // Players can only see their own discounts
    if (req.user.role === 'PLAYER' && req.user.sub !== userId) {
      throw new Error('Access denied: You can only view your own discounts');
    }

    return this.discountEligibilityService.getExpiredDiscounts(userId);
  }

  @Get('discounts/:id')
  @Roles('ADMIN', 'MANAGER')
  async findOne(@Param('id') id: string) {
    return this.discountEligibilityService.findOne(id);
  }

  @Post(':id/discounts')
  @Roles('ADMIN', 'MANAGER')
  async create(
    @Param('id') id: string,
    @Body() createDiscountEligibilityDto: CreateDiscountEligibilityDto,
    @Request() req?: any,
  ) {
    const userId = parseInt(id);

    // Managers can only add discounts for their team members
    if (req.user.role === 'MANAGER') {
      // TODO: Add team-based validation
      // For now, we'll allow managers to add discounts for any user
    }

    return this.discountEligibilityService.create(userId, createDiscountEligibilityDto, req.user.sub);
  }

  @Put('discounts/:id')
  @Roles('ADMIN', 'MANAGER')
  async update(
    @Param('id') id: string,
    @Body() updateDiscountEligibilityDto: UpdateDiscountEligibilityDto,
  ) {
    return this.discountEligibilityService.update(id, updateDiscountEligibilityDto);
  }

  @Delete('discounts/:id')
  @Roles('ADMIN', 'MANAGER')
  async delete(@Param('id') id: string) {
    return this.discountEligibilityService.delete(id);
  }

  @Get(':id/discounts/check/:type')
  @Roles('ADMIN', 'MANAGER', 'PLAYER')
  async isEligibleForDiscount(
    @Param('id') id: string,
    @Param('type') type: DiscountType,
    @Request() req?: any,
  ) {
    const userId = parseInt(id);

    // Players can only check their own discount eligibility
    if (req.user.role === 'PLAYER' && req.user.sub !== userId) {
      throw new Error('Access denied: You can only check your own discount eligibility');
    }

    return {
      userId,
      discountType: type,
      isEligible: await this.discountEligibilityService.isEligibleForDiscount(userId, type),
    };
  }

  @Post('discounts/deactivate-expired')
  @Roles('ADMIN')
  async deactivateExpiredDiscounts() {
    return this.discountEligibilityService.deactivateExpiredDiscounts();
  }
}
