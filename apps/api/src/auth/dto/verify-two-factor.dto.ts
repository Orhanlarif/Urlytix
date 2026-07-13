import { IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyTwoFactorDto {
  @IsString()
  @MinLength(20)
  @MaxLength(500)
  twoFactorToken!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(32)
  code!: string;
}
