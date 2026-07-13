import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/[a-z]/, { message: 'Şifre en az bir küçük harf içermeli.' })
  @Matches(/[A-Z]/, { message: 'Şifre en az bir büyük harf içermeli.' })
  @Matches(/\d/, { message: 'Şifre en az bir rakam içermeli.' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Şifre en az bir sembol içermeli.' })
  newPassword!: string;
}
