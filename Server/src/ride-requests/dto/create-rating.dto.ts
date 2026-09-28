import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRatingDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  stars: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  comment?: string;
}
