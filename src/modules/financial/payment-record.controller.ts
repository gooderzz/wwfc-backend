import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PaymentRecordService } from './payment-record.service';
import { CreatePaymentRecordDto, UpdatePaymentRecordDto, MarkPaymentPaidDto } from './dto/payment-record.dto';
import { PaymentType, PaymentStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentRecordController {
  constructor(private readonly paymentRecordService: PaymentRecordService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  findAll(
    @Query('userId') userId?: string,
    @Query('paymentType') paymentType?: PaymentType,
    @Query('status') status?: PaymentStatus,
    @Query('teamId') teamId?: string,
    @Query('dueDateFrom') dueDateFrom?: string,
    @Query('dueDateTo') dueDateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const filters: any = {};

    if (userId) {
      filters.userId = parseInt(userId);
    }

    if (paymentType) {
      filters.paymentType = paymentType;
    }

    if (status) {
      filters.status = status;
    }

    if (teamId) {
      filters.teamId = parseInt(teamId);
    }

    if (dueDateFrom) {
      filters.dueDateFrom = new Date(dueDateFrom);
    }

    if (dueDateTo) {
      filters.dueDateTo = new Date(dueDateTo);
    }

    // Pagination parameters
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 25;
    filters.page = pageNum;
    filters.limit = limitNum;

    // If user is a manager, only show their team's payments
    if (req.user.role === 'MANAGER' && req.user.teamId) {
      filters.teamId = req.user.teamId;
    }

    return this.paymentRecordService.findAll(filters);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  findOne(@Param('id') id: string, @Request() req?: any) {
    return this.paymentRecordService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(
    @Body() createPaymentRecordDto: CreatePaymentRecordDto,
    @Request() req?: any,
  ) {
    return this.paymentRecordService.create(createPaymentRecordDto, req.user.sub);
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER')
  update(
    @Param('id') id: string,
    @Body() updatePaymentRecordDto: UpdatePaymentRecordDto,
  ) {
    return this.paymentRecordService.update(id, updatePaymentRecordDto);
  }

  @Post(':id/mark-paid')
  @Roles('ADMIN', 'MANAGER')
  markAsPaid(
    @Param('id') id: string,
    @Body() markPaymentPaidDto: MarkPaymentPaidDto,
    @Request() req?: any,
  ) {
    return this.paymentRecordService.markAsPaid(id, markPaymentPaidDto, req.user.sub);
  }

  @Post('bulk-mark-paid')
  @Roles('ADMIN', 'MANAGER')
  bulkMarkAsPaid(
    @Body() body: { ids: string[]; paymentData: MarkPaymentPaidDto },
    @Request() req?: any,
  ) {
    return this.paymentRecordService.bulkMarkAsPaid(body.ids, body.paymentData, req.user.sub);
  }

  @Delete(':id')
  @Roles('ADMIN')
  delete(@Param('id') id: string) {
    return this.paymentRecordService.delete(id);
  }

  @Post('update-overdue')
  @Roles('ADMIN')
  updateOverdueStatus() {
    return this.paymentRecordService.updateOverdueStatus();
  }
}
