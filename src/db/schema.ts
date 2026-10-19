import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const gifts = pgTable('gifts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  stock: integer('stock').notNull(),
  initialStock: integer('initial_stock'),
  minStock: integer('min_stock').notNull(),
  icon: text('icon').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const withdrawalLogs = pgTable('withdrawal_logs', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  dateFormatted: text('date_formatted').notNull(),
  giftName: text('gift_name').notNull(),
  giftId: text('gift_id').notNull(),
  qtyDisplay: text('qty_display').notNull(),
  person: text('person').notNull(),
  reason: text('reason'),
  reserved: text('reserved'),
  createdAt: timestamp('created_at').defaultNow(),
});
