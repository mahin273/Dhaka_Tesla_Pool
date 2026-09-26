import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CoordinatesDto } from './coordinates.dto';

export class RouteLegDto {
  @ValidateNested()
  @Type(() => CoordinatesDto)
  pickup: CoordinatesDto;

  @ValidateNested()
  @Type(() => CoordinatesDto)
  dropoff: CoordinatesDto;
}

export class EvaluateCompatibilityDto {
  @ValidateNested()
  @Type(() => RouteLegDto)
  legA: RouteLegDto;

  @ValidateNested()
  @Type(() => RouteLegDto)
  legB: RouteLegDto;
}
