import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/**
 * All fields from CreateProductDto become optional for PATCH operations.
 * Inherits all validators — only provided fields are validated.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
