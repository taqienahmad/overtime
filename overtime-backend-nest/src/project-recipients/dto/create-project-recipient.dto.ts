import { IsEmail, IsIn, IsNotEmpty, IsString } from 'class-validator';

export const RECIPIENT_TYPES = ['TO', 'CC'] as const;

export class CreateProjectRecipientDto {
  @IsString()
  @IsNotEmpty()
  project_name: string;

  @IsEmail()
  email: string;

  @IsIn(RECIPIENT_TYPES)
  type: 'TO' | 'CC';
}
