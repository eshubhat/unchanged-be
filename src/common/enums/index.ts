// ─── User Roles ────────────────────────────────────────────────────────────────
export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

// ─── Order Status ───────────────────────────────────────────────────────────────
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned',
  REFUNDED = 'refunded',
}

// ─── Payment Status ─────────────────────────────────────────────────────────────
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIAL_REFUND = 'partial_refund',
}

// ─── Payment Method ─────────────────────────────────────────────────────────────
export enum PaymentMethod {
  CARD = 'card',
  UPI = 'upi',
  NETBANKING = 'netbanking',
  WALLET = 'wallet',
  COD = 'cod',
  EMI = 'emi',
}

// ─── Refund Status ──────────────────────────────────────────────────────────────
export enum RefundStatus {
  INITIATED = 'initiated',
  PROCESSED = 'processed',
  FAILED = 'failed',
}

// ─── Coupon Type ────────────────────────────────────────────────────────────────
export enum CouponType {
  FLAT = 'flat',
  PERCENT = 'percent',
  FREE_SHIPPING = 'free_shipping',
  BUY_X_GET_Y = 'buy_x_get_y',
}

// ─── Stock Movement Reason ──────────────────────────────────────────────────────
export enum StockMovementReason {
  PURCHASE = 'purchase',
  SALE = 'sale',
  RETURN = 'return',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer',
  DAMAGE = 'damage',
  OPENING_STOCK = 'opening_stock',
}

// ─── Product Size ───────────────────────────────────────────────────────────────
export enum ProductSize {
  XS = 'XS',
  S = 'S',
  M = 'M',
  L = 'L',
  XL = 'XL',
  XXL = 'XXL',
  XXXL = 'XXXL',
  FREE_SIZE = 'FREE_SIZE',
}

// ─── Banner Position ────────────────────────────────────────────────────────────
export enum BannerPosition {
  HERO = 'hero',
  HOMEPAGE_MID = 'homepage_mid',
  CATEGORY_TOP = 'category_top',
  SIDEBAR = 'sidebar',
  POPUP = 'popup',
}

// ─── Media Entity Type ──────────────────────────────────────────────────────────
export enum MediaEntityType {
  PRODUCT = 'product',
  REVIEW = 'review',
  CATEGORY = 'category',
  BRAND = 'brand',
  COLLECTION = 'collection',
  BANNER = 'banner',
  USER = 'user',
}

// ─── Audit Action ───────────────────────────────────────────────────────────────
export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
}

// ─── Return/Cancellation Status ─────────────────────────────────────────────────
export enum RequestStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

// ─── Payment Razorpay Status ────────────────────────────────────────────────────
export enum RazorpayPaymentStatus {
  CREATED = 'created',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}
