import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllPositions() {
    return this.positionsService.getAllPositions();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getPositionById(@Param('id', ParseIntPipe) id: number) {
    return this.positionsService.getPositionById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  async createPosition(@Body() body: { name: string; description?: string }) {
    return this.positionsService.createPosition(body.name, body.description);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  async updatePosition(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; description?: string }
  ) {
    return this.positionsService.updatePosition(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  async deletePosition(@Param('id', ParseIntPipe) id: number) {
    return this.positionsService.deletePosition(id);
  }
}
