import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { TrainingCostsService } from './training-costs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('training-costs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class TrainingCostsController {
  constructor(private readonly trainingCostsService: TrainingCostsService) {}

  @Get()
  async findAll() {
    return this.trainingCostsService.findAll();
  }

  @Get(':type')
  async findOne(@Param('type') type: string) {
    return this.trainingCostsService.findOne(type);
  }

  @Patch(':type')
  async update(@Param('type') type: string, @Body() body: { cost: number }) {
    return this.trainingCostsService.update(type, body.cost);
  }

  @Post()
  async create(@Body() body: { trainingType: string; cost: number }) {
    return this.trainingCostsService.create(body.trainingType, body.cost);
  }

  @Delete(':type')
  async delete(@Param('type') type: string) {
    return this.trainingCostsService.delete(type);
  }
}
