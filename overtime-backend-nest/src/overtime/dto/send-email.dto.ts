import { IsEmail, IsString, IsNotEmpty, IsUrl } from 'class-validator';

export class SendEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  project: string;

  @IsUrl({ require_tld: false })
  approvalUrl: string;
}
