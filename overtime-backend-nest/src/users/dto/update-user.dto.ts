import { IsIn, IsOptional, IsString } from 'class-validator';
import { ALLOWED_ROLES } from '../../auth/dto/register.dto';

export const ALLOWED_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(ALLOWED_ROLES)
  role?: string;

  @IsOptional()
  @IsIn(ALLOWED_STATUSES)
  status?: string;
}
