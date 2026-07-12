import { IsNotEmpty, IsString } from 'class-validator';
import { AnalyticsQueryDto } from './analytics-query.dto';

export class WorkspaceAnalyticsQueryDto extends AnalyticsQueryDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;
}
