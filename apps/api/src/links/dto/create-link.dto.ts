import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateLinkDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsUrl(
    {
      require_protocol: true,
    },
    {
      message: 'Geçerli bir URL gir. Örnek: https://example.com',
    },
  )
  originalUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Kısa link sadece harf, sayı, tire ve alt çizgi içerebilir.',
  })
  customAlias?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Geçerli bir bitiş tarihi gir.' })
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(72)
  password?: string;
}
