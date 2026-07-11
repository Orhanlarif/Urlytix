import { IsFQDN, IsString, MaxLength } from 'class-validator';

export class CreateDomainDto {
  @IsString()
  @IsFQDN({ require_tld: true })
  @MaxLength(253)
  hostname!: string;
}
