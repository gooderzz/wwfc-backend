import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { TrialistsService } from './trialists.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('trialists')
export class TrialistsController {
  constructor(private readonly trialistsService: TrialistsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  @Get()
  async getAllTrialists() {
    return this.trialistsService.getAllTrialists();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  @Get('stats')
  async getTrialistStats() {
    return this.trialistsService.getTrialistStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  @Get('position/:positionId')
  async getTrialistsByPosition(@Param('positionId', ParseIntPipe) positionId: number) {
    return this.trialistsService.getTrialistsByPosition(positionId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  @Get(':id')
  async getTrialistById(@Param('id', ParseIntPipe) id: number) {
    return this.trialistsService.getTrialistById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  @Post(':id/rate')
  async rateTrialist(
    @Param('id', ParseIntPipe) trialistId: number,
    @Body() body: { rating: number; interested: boolean; notes?: string },
    @Req() req: any
  ) {
    return this.trialistsService.rateTrialist(
      trialistId,
      req.user.userId,
      body.rating,
      body.interested,
      body.notes
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  async updateTrialistStatus(
    @Param('id', ParseIntPipe) trialistId: number,
    @Body() body: { status: 'ACTIVE' | 'REJECTED' | 'PROMOTED'; teamId?: number }
  ) {
    return this.trialistsService.updateTrialistStatus(trialistId, body.status, body.teamId);
  }
}
