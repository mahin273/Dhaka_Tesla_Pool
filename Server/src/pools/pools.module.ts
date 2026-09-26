import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MatchingModule } from '../matching/matching.module';
import { PoolsController } from './pools.controller';
import { PoolsService } from './pools.service';

@Module({
  imports: [PrismaModule, MatchingModule],
  controllers: [PoolsController],
  providers: [PoolsService],
  exports: [PoolsService],
})
export class PoolsModule {}

