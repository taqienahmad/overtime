import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class ApprovalSessionDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  project: string;
}
