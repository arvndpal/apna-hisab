import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendNotificationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  body!: string;

  @IsIn(['all', 'user'])
  target!: 'all' | 'user';

  /** Required when target is 'user' — checked in the controller, not here (keeps the DTO simple). */
  @IsOptional()
  @IsString()
  userId?: string;
}
