export interface ProductData extends Record<string, unknown> {
  productName: string;

  description?: string;

  // Is the product publicly visible
  public?: boolean;
  // Is the related not to a specific brand
  generic?: boolean;

  // User provided organisation name associated with this product
  organisationText?: string;
  // System resolved organisation name associated with this product
  organisationName?: string;
  // System associated organisation name associated with this product
  organisationId?: string;
}

export interface Product extends ProductData {
  productId: string;
  createdAt: string;
  updatedAt: string;
}
