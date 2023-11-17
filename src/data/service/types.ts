export interface ServiceData extends Record<string, unknown> {
  serviceName: string;

  description?: string;

  // Is the service publicly visible
  public?: boolean;
  // Is the related not to a specific brand
  generic?: boolean;

  // User provided organisation name associated with this service
  organisationText?: string;
  // System resolved organisation name associated with this service
  organisationName?: string;
  // System associated organisation name associated with this service
  organisationId?: string;
}

export interface Service extends ServiceData {
  serviceId: string;
  createdAt: string;
  updatedAt: string;
}
