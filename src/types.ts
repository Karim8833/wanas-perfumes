export type BottleSize = '30ml' | '50ml' | '100ml';
export type Role = 'Owner' | 'Moderator' | 'Observer';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: Role;
}

export interface PresetOption {
  id: string;
  label: string;
  price: number;
}

export interface SystemSettings {
  packagingConstant: number;
  profitMargin: number;
  reinvestmentMargin: number;
  sizes: {
    '30ml': { constant: number; oilVol: number };
    '50ml': { constant: number; oilVol: number };
    '100ml': { constant: number; oilVol: number };
  };
  bottlePresets: PresetOption[];
  oilPresets: PresetOption[];
}

export interface OrderItem {
  perfumeName: string;
  size: BottleSize;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  clientName: string;
  phone?: string;
  address?: string;
  items: OrderItem[];
  totalOrderValue: number;
  status: 'Pending' | 'Prepared' | 'Sold';
  createdAt: Date;
  preparedAt?: Date;
  soldAt?: Date;
}
