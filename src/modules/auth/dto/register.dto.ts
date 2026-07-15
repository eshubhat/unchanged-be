import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class RegisterAddressDto {
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
}

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  lastName?: string;

  @ApiProperty({
    example: 'P@ssword123',
    description:
      'Min 8 chars, at least one uppercase, one lowercase, one number, one special char',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72, { message: 'Password must not exceed 72 characters' }) // bcrypt limit
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain uppercase, lowercase, number and special character',
  })
  password: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  @Transform(({ value }) => value?.trim())
  phone?: string;

  /** First shipping address — collected at registration to pre-fill checkout */
  @ApiPropertyOptional({ type: () => RegisterAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RegisterAddressDto)
  address?: RegisterAddressDto;
}
