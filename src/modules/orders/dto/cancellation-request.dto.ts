import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCancellationRequestDto {
  @ApiProperty({ example: 'Changed my mind' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;
}

export class ResolveCancellationRequestDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsString()
  @IsNotEmpty()
  action: 'approved' | 'rejected';

  @ApiPropertyOptional({ example: 'Cancellation approved.' })
  @IsOptional()
  @IsString()
  adminNote?: string;
}
