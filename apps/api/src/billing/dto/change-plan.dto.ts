import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePlanDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  planCode!: string;
}
