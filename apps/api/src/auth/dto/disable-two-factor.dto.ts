import { IsString, MaxLength, MinLength } from 'class-validator';

export class DisableTwoFactorDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(32)
  code!: string;
}
