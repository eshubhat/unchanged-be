import {
  IsUUID,
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  ValidateNested,
  IsNumber,
  Min,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../../common/enums';

export class CreateOrderItemDto {
  @ApiProperty({ description: 'ProductVariant UUID' })
  @IsUUID()
  variantId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Delivery address UUID from user addresses' })
  @IsUUID()
  addressId: string;

  @ApiPropertyOptional({ description: 'Coupon code to apply', example: 'SUMMER20' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  couponCode?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.UPI })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'Leave at the door.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  /**
   * Optional: For mobile clients that want to specify items explicitly
   * (e.g. buy-now flow bypassing cart).
   * If omitted, order is built from the user's active cart.
   */
  @ApiPropertyOptional({
    description: 'If provided, creates order from these items (buy-now). Otherwise uses cart.',
    type: [CreateOrderItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];
}
