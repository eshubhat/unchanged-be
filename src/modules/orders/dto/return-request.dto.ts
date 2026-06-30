import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReturnRequestDto {
  @ApiProperty({ example: 'Received damaged product' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;

  @ApiPropertyOptional({ example: 'The print is faded and the stitching is broken.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'S3 URLs of uploaded proof images (max 5)',
    example: ['https://cdn.example.com/return-evidence-1.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  evidenceUrls?: string[];
}

export class ResolveReturnRequestDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsString()
  @IsNotEmpty()
  action: 'approved' | 'rejected';

  @ApiPropertyOptional({ example: 'Return approved. Refund will be processed in 5-7 days.' })
  @IsOptional()
  @IsString()
  adminNote?: string;

  @ApiPropertyOptional({ description: 'Refund amount (required when action=approved)' })
  @IsOptional()
  refundAmount?: number;
}
