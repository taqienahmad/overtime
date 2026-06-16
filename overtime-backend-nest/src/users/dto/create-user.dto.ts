import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ALLOWED_ROLES } from '../../auth/dto/register.dto';

export class CreateUserDto {
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
