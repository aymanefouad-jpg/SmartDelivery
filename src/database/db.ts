import * as SQLite from 'expo-sqlite';
import { Delivery } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

export const getDB = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('afd_delivery.db');
  await initializeDatabase(db);
  return db;
};

const initializeDatabase = async (database: SQLite.SQLiteDatabase) => {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      order_index INTEGER DEFAULT 0,
      status TEXT DEFAULT 'NEW',
      amount TEXT,
      order_number TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
    CREATE INDEX IF NOT EXISTS idx_deliveries_created ON deliveries(created_at);
    CREATE INDEX IF NOT EXISTS idx_deliveries_phone ON deliveries(phone);

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      latitude REAL,
      longitude REAL,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
  `);
};

// Delivery operations
export const saveDelivery = async (delivery: Delivery): Promise<void> => {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO deliveries 
    (id, name, address, phone, latitude, longitude, order_index, status, amount, order_number, notes, created_at, updated_at, synced)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      delivery.id,
      delivery.name,
      delivery.address,
      delivery.phone,
      delivery.latitude ?? null,
      delivery.longitude ?? null,
      delivery.order,
      'NEW',
      null,
      null,
      null,
      Date.now(),
      Date.now(),
      0,
    ]
  );
};

export const getAllDeliveries = async (): Promise<Delivery[]> => {
  const database = await getDB();
  const rows = await database.getAllAsync<any>(
    'SELECT * FROM deliveries ORDER BY created_at DESC'
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    latitude: row.latitude,
    longitude: row.longitude,
    order: row.order_index,
  }));
};

export const deleteDelivery = async (id: string): Promise<void> => {
  const database = await getDB();
  await database.runAsync('DELETE FROM deliveries WHERE id = ?', [id]);
};

export const updateDeliveryOrder = async (deliveries: Delivery[]): Promise<void> => {
  const database = await getDB();
  for (const d of deliveries) {
    await database.runAsync(
      'UPDATE deliveries SET order_index = ?, updated_at = ? WHERE id = ?',
      [d.order, Date.now(), d.id]
    );
  }
};

export const clearAllDeliveries = async (): Promise<void> => {
  const database = await getDB();
  await database.runAsync('DELETE FROM deliveries');
};