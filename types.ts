export type Role = 'admin' | 'editor' | 'viewer';

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
  date: string;
  notes?: string;
  images?: string[];
}

export type ViewState = 'dashboard' | 'inventory' | 'add' | 'edit' | 'reports' | 'inbound' | 'outbound' | 'users' | 'settings';