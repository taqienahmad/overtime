import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export const ALLOWED_ROLES = [
  'ADMIN',
  'WFM',
  'OPERATIONAL_MANAGER',
  'UNIT_MANAGER',
] as const;

export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  @IsOptional()
  @IsIn(ALLOWED_ROLES)
  role?: string;
}
