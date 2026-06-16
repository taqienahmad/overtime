import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ApprovalMemberDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  id: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  billable_hours: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  non_billable_hours: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remark?: string;
}

export class SubmitApprovalDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApprovalMemberDto)
  members: ApprovalMemberDto[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  validatorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  validatorDevice?: string;

  @IsOptional()
  @IsIn(['PER_NAME', 'TOTAL'])
  validationMethod?: 'PER_NAME' | 'TOTAL';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalBillableHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalNonBillableHours?: number;
}
