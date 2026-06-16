import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateEmailScheduleDto {
  @IsBoolean()
  enabled: boolean;

  // 0 = Minggu ... 6 = Sabtu (sama seperti Date.getDay())
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek: number[];

  @IsInt()
  @Min(0)
  @Max(23)
  hour: number;

  @IsInt()
  @Min(0)
  @Max(59)
  minute: number;

  @IsOptional()
  @IsString()
  timezone?: string;
}
