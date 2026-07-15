import type { ErpProduct } from 'twenty-shared/erp-maroc';

export type ProductFormValues = {
  code: string;
  name: string;
  description: string;
  type: string;
  unit: string;
  defaultPriceHt: string;
  tvaRate: string;
  incomeAccountCode: string;
  isActive: boolean;
};

export type ProductDrawerState =
  | { mode: 'create' }
  | { mode: 'edit'; product: ErpProduct };

export type ProductReconciliationState =
  | 'refreshing'
  | 'failed'
  | 'ready'
  | null;

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  code: '',
  name: '',
  description: '',
  type: 'PRODUIT',
  unit: 'unité',
  defaultPriceHt: '',
  tvaRate: '20',
  incomeAccountCode: '',
  isActive: true,
};

export const PRODUCT_TVA_RATES = new Set([0, 7, 10, 14, 20]);

export const REQUIRED_PRODUCT_FIELDS = [
  'code',
  'name',
  'type',
  'unit',
] as const;

export const productToFormValues = (
  product: ErpProduct,
): ProductFormValues => ({
  code: product.code,
  name: product.name,
  description: product.description ?? '',
  type: product.type,
  unit: product.unit,
  defaultPriceHt: String(product.defaultPriceHt),
  tvaRate: String(product.tvaRate),
  incomeAccountCode: product.incomeAccountCode ?? '',
  isActive: product.isActive,
});
