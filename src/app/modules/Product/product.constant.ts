export const productSearchableFields = ['name', 'slug', 'description'];

export const productFilterableFields = [
  'searchTerm',
  'unit',
  'isDeleted',
  'isDeleteRequested',
  'minPrice',
  'maxPrice',
];

export const productProfitSortFields = [
  'name',
  'soldQty',
  'salesTotal',
  'purchaseCost',
  'profit',
  'profitPercent',
  'avgPurchase',
  'avgSale',
] as const;

export type ProductProfitSortField = (typeof productProfitSortFields)[number];

/** Shop timezone for calendar-day date filters (Bangladesh). */
export const PRODUCT_PROFIT_DATE_TZ_OFFSET = '+06:00';
