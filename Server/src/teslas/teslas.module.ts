import { Module } from '@nestjs/common';
import { TeslasService } from './teslas.service';
import { TeslasController } from './teslas.controller';

@Module({
  controllers: [TeslasController],
  providers: [TeslasService],
  exports: [TeslasService],
})
export class TeslasModule {}
