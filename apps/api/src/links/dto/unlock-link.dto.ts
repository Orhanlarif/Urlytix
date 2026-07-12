import { IsString, MaxLength, MinLength } from 'class-validator';

export class UnlockLinkDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;
}
