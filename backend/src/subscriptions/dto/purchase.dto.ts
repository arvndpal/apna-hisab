import { IsIn, IsString, MinLength } from 'class-validator';

export class PurchaseDto {
  @IsIn(['monthly', 'yearly'])
  plan!: 'monthly' | 'yearly';

  @IsString()
  @MinLength(1)
  productId!: string;
}
