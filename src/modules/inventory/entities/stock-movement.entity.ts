import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { StockMovementReason } from '../../../common/enums';
import { ProductVariant } from '../../catalog/entities/product-variant.entity';
import { Warehouse } from './warehouse.entity';
import { Inventory } from './inventory.entity';
import { User } from '../../auth/entities/user.entity';
import { PrimaryGeneratedColumn } from 'typeorm';

/**
 * Immutable ledger — never soft-delete or update rows.
 * Each row records a single +/- quantity event.
 */
@Entity('stock_movements')
@Index(['inventoryId', 'createdAt'])
@Index(['variantId', 'reason'])
@Index(['referenceId'])
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'inventory_id', type: 'uuid' })
  inventoryId: string;

  @Column({ name: 'variant_id', type: 'uuid' })
  variantId: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  /**
   * Positive = stock in. Negative = stock out.
   */
  @Column({ name: 'change_qty', type: 'int' })
  changeQty: number;

  @Column({ name: 'before_qty', type: 'int' })
  beforeQty: number;

  @Column({ name: 'after_qty', type: 'int' })
  afterQty: number;

  @Column({
    name: 'reason',
    type: 'enum',
    enum: StockMovementReason,
  })
  reason: StockMovementReason;

  /**
   * order_id, return_request_id, etc.
   */
  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToOne(() => Inventory, (inv) => inv.stockMovements, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'inventory_id' })
  inventory: Inventory;

  @ManyToOne(() => ProductVariant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @ManyToOne(() => Warehouse, (wh) => wh.stockMovements, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User | null;
}
