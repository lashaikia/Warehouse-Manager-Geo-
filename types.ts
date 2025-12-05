export type Role = 'admin' | 'editor' | 'viewer';
export type Unit = 'pcs' | 'kg' | 'm' | 'l';

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
  unit: Unit; // New field
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
  unit: Unit; // New field to track unit history
  date: string;
  receiver?: string;
  notes?: string;
  images?: string[];
  isDebt?: boolean; // New field for "Pending Document/Debt"
  resolutionImage?: string; // Photo of the document when debt is resolved
  resolutionDate?: string; // Date when debt was resolved
}

export type ViewState = 'dashboard' | 'inventory' | 'add' | 'edit' | 'reports' | 'custom_report' | 'inbound' | 'outbound' | 'users' | 'settings';