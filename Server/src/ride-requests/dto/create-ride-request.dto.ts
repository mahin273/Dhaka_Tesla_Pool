import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRideRequestDto {
  @IsString()
  @IsNotEmpty()
  pickupZoneId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLng: number;

  @IsString()
  @IsNotEmpty()
  dropoffZoneId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  dropoffLat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  dropoffLng: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(3)
  seatsRequested: number;
}
