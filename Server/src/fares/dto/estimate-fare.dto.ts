import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class EstimateFareDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  distanceKm: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isPooled?: boolean;
}
