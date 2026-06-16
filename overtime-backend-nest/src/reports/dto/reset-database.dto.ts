import { IsNotEmpty, IsString } from 'class-validator';

export class ResetDatabaseDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}
