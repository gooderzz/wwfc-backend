import { Module } from '@nestjs/common';
import { FormationsController } from './formations.controller';
import { FormationsService } from './formations.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [FormationsController],
  providers: [FormationsService, PrismaService],
  exports: [FormationsService]
})
export class FormationsModule {}
