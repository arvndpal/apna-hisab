import { IsString, MinLength } from 'class-validator';

export class DeleteTokenDto {
  @IsString()
  @MinLength(10)
  token!: string;
}
