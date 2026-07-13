import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateLinkDto {
  @IsOptional()
  @IsUrl(
    {
      require_protocol: true,
    },
    {
      message: 'Geçerli bir URL gir. Örnek: https://example.com',
    },
  )
  originalUrl?: string;

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
  @Matches(/^(?!(?:api|docs|health|metrics|r)$)/i, {
    message: 'Bu kısa link sistem tarafından rezerve edilmiştir.',
  })
  customAlias?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsISO8601({}, { message: 'Geçerli bir ISO tarih formatı gir.' })
  expiresAt?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MinLength(4)
  @MaxLength(72)
  password?: string | null;
}
