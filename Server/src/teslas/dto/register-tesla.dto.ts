import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class RegisterTeslaDto {
  @IsString()
  @IsNotEmpty({ message: 'Tesla vehicle name is required' })
  name: string;

  @IsInt({ message: 'Capacity must be an integer' })
  @Min(1, { message: 'Capacity must be at least 1 seat' })
  @Max(6, { message: 'Capacity cannot exceed 6 seats' })
  capacity: number;
}
