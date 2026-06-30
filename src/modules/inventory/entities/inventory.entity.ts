import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  Check,
  VersionColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProductVariant } from '../../catalog/entities/product-variant.entity';
import { Warehouse } from './warehouse.entity';
import { StockMovement } from './stock-movement.entity';

@Entity('inventory')
@Index(['variantId', 'warehouseId'], { unique: true })
@Index(['quantity'])
@Check(`"quantity" >= 0`)
@Check(`"reserved_quantity" >= 0`)
export class Inventory extends BaseEntity {
  @Column({ name: 'variant_id', type: 'uuid' })
  variantId: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ name: 'quantity', type: 'int', default: 0 })
  quantity: number;

  /**
   * Stock earmarked for pending orders — not yet deducted.
   */
  @Column({ name: 'reserved_quantity', type: 'int', default: 0 })
  reservedQuantity: number;

  @Column({ name: 'low_stock_threshold', type: 'int', default: 5 })
  lowStockThreshold: number;

  /**
   * Optimistic locking to prevent race conditions on concurrent stock updates.
   */
  @VersionColumn({ name: 'version' })
  version: number;

  // ─── Computed helpers (not persisted) ──────────────────────────────────────
  get availableQuantity(): number {
    return this.quantity - this.reservedQuantity;
  }

  get isLowStock(): boolean {
    return this.availableQuantity <= this.lowStockThreshold;
  }

  // ─── Relations ─────────────────────────────────────────────────────────────
  @OneToOne(() => ProductVariant, (variant) => variant.inventory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @ManyToOne(() => Warehouse, (wh) => wh.inventory, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @OneToMany(() => StockMovement, (mov) => mov.inventory)
  stockMovements: StockMovement[];
}
