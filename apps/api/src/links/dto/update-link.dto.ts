import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
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
