import { IsBoolean } from 'class-validator';

export class UpdateOnlineStatusDto {
  @IsBoolean({ message: 'isOnline must be a boolean value' })
  isOnline: boolean;
}
