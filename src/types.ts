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
  miscCost: number;
  stickerCost: number;
  targetCostPercentage: number;
  boxSellingPrice?: number;
  sizes: {
    '30ml': { constant: number; oilVol: number };
    '50ml': { constant: number; oilVol: number };
    '100ml': { constant: number; oilVol: number };
  };
  bottlePresets: PresetOption[];
  oilPresets: PresetOption[];
}

export interface MixIngredient {
  perfumeName: string;
  amountMl: number;
  costPrice?: number;
}

export interface OrderItem {
  perfumeName: string;
  size: BottleSize;
  quantity: number;
  unitPrice: number;
  premiumBox?: boolean;
  isMix?: boolean;
  isMakhamria?: boolean;
  makhamriaId?: string;
  ingredients?: MixIngredient[];
  oilCostPrice?: number;
  bottleName?: string;
  bottlePrice?: number;
  manualDiscount?: number;
  manualPlus?: number;
  calculatedCost?: number;
  suggestedPrice?: number;
}

export interface Order {
  id: string;
  clientName: string;
  phone?: string;
  address?: string;
  items: OrderItem[];
  totalOrderValue: number;
  revenue?: number;
  profit?: number;
  status: 'Pending' | 'Prepared' | 'Sold';
  createdAt: Date;
  preparedAt?: Date;
  soldAt?: Date;
  stockDeducted?: boolean;
}

export interface Perfume {
  id: string;
  name: string;
  base_price?: number;
  selling_price?: number;
  cost_price?: number;
  stock_ml?: number;
  created_at?: string;
}

export interface Makhamria {
  id: string;
  name: string;
  cost_price?: number;
  selling_price?: number;
  stock_qty?: number;
  created_at?: string;
}

