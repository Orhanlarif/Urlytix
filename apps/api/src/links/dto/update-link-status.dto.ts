import { IsIn } from 'class-validator';

export class UpdateLinkStatusDto {
  @IsIn(['ACTIVE', 'DISABLED', 'EXPIRED'], {
    message: 'Status sadece ACTIVE, DISABLED veya EXPIRED olabilir.',
  })
  status!: 'ACTIVE' | 'DISABLED' | 'EXPIRED';
}
