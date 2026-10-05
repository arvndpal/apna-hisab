import { IsString, MinLength } from 'class-validator';

export class GoogleSignInDto {
  @IsString()
  @MinLength(10)
  idToken!: string;
}
