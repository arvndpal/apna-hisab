import { Type } from 'class-transformer';
import { IsIn, IsISO8601, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SYNCED_TABLES } from '../sync.constants.js';

export class PullQueryDto {
  @IsString()
  @IsIn(SYNCED_TABLES)
  table!: (typeof SYNCED_TABLES)[number];

  /** Rows with updated_at strictly greater than this are returned. Omit to pull everything (first login / new device). */
  @IsOptional()
  @IsISO8601()
  since?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 500;
}
