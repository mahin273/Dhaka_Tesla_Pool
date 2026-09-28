import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateDriverLocationDto {
  @IsString()
  @IsNotEmpty({ message: 'zoneId is required' })
  zoneId: string;
}
