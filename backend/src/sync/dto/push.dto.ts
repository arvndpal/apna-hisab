import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsObject, IsString, ValidateNested } from 'class-validator';
import { SYNCED_TABLES } from '../sync.constants.js';

export class PushChangeDto {
  @IsString()
  @IsIn(SYNCED_TABLES)
  tableName!: (typeof SYNCED_TABLES)[number];

  /** The full current row, column-named exactly as the local SQLite / Supabase schema (snake_case). user_id is ignored and set server-side. */
  @IsObject()
  row!: Record<string, unknown>;
}

export class PushDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PushChangeDto)
  changes!: PushChangeDto[];
}
