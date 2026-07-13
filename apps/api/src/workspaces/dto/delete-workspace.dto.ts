import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class DeleteWorkspaceDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/)
  confirmSlug!: string;
}
