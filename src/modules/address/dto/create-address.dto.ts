import {
  IsString,
  IsOptional,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'Home', description: 'Label for this address' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  label?: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  fullName: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @MaxLength(15)
  @Transform(({ value }) => value?.trim())
  phone: string;

  @ApiProperty({ example: 'House 12, Baker Street, Koramangala' })
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Near Residency Road' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  addressLine2?: string;

  @ApiPropertyOptional({ example: 'Near Apollo Hospital' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  landmark?: string;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  city: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  state: string;

  @ApiProperty({ example: '560034' })
  @IsString()
  @MaxLength(10)
  @Transform(({ value }) => value?.trim())
  pincode: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  country?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
