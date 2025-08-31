import { Module } from '@nestjs/common';
import { TrialistsController } from './trialists.controller';
import { TrialistsService } from './trialists.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [TrialistsController],
  providers: [TrialistsService, PrismaService],
  exports: [TrialistsService],
})
export class TrialistsModule {}
