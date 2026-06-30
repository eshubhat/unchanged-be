import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Inventory } from './inventory.entity';
import { StockMovement } from './stock-movement.entity';

@Entity('warehouses')
@Index(['code'], { unique: true })
@Index(['isActive'])
export class Warehouse extends BaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  @Column({ name: 'address_line1', type: 'varchar', length: 255 })
  addressLine1: string;

  @Column({ name: 'address_line2', type: 'varchar', length: 255, nullable: true })
  addressLine2: string | null;

  @Column({ name: 'city', type: 'varchar', length: 100 })
  city: string;

  @Column({ name: 'state', type: 'varchar', length: 100 })
  state: string;

  @Column({ name: 'pincode', type: 'varchar', length: 10 })
  pincode: string;

  @Column({ name: 'country', type: 'varchar', length: 100, default: 'India' })
  country: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 15, nullable: true })
  contactPhone: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @OneToMany(() => Inventory, (inv) => inv.warehouse)
  inventory: Inventory[];

  @OneToMany(() => StockMovement, (mov) => mov.warehouse)
  stockMovements: StockMovement[];
}
