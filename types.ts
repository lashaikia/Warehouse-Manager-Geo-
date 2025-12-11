
export type Role = 'admin' | 'editor' | 'viewer';
// Unit is now a string to support dynamic units like "Box", "Set", "ცალი", "წყვილი" etc.
export type Unit = string; 
export type Theme = 'classic' | 'executive' | 'glass' | 'midnight' | 'nature' | 'sunset';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  password?: string;
}

export interface Product {
  id: string;
  nomenclature: string;
  name: string;
  category: string;
  quantity: number;
  unit: Unit;
  warehouse: string;
  rack: string;
  minQuantity: number;
  lastUpdated: string;
  dateAdded: string;
  images: string[];
  isLowStockTracked: boolean;
}

export interface Transaction {
  id: string;
  productId: string;
  productName: string;
  productNomenclature: string;
  type: 'inbound' | 'outbound';
  quantity: number;
  unit: Unit;
  date: string;
  receiver?: string;
  notes?: string;
  images?: string[];
  isDebt?: boolean;
  resolutionImage?: string;
  resolutionDate?: string;
}

export type ViewState = 'dashboard' | 'inventory' | 'add' | 'edit' | 'reports' | 'custom_report' | 'inbound' | 'outbound' | 'users' | 'settings';
