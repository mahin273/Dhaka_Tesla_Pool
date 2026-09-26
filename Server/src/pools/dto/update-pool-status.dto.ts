import { IsEnum, IsNotEmpty } from 'class-validator';
import { PoolStatus } from '@prisma/client';

export class UpdatePoolStatusDto {
  @IsEnum(PoolStatus)
  @IsNotEmpty()
  status: PoolStatus;
}
