import { ArrayNotEmpty, IsArray, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ClaimSeatsDto {
  @IsString()
  @IsNotEmpty()
  teslaId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  rideRequestIds: string[];

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  seatsNeeded: number;
}
