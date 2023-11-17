import { Service } from "./types";
import { getServiceStore } from "./store";

export interface ListServicesInput {
  // Only return generic services
  generic?: boolean;
  // Only return public services, regardless if the user is anonymous
  public?: boolean;
}

export async function listServices<P extends Service = Service>(options: ListServicesInput = {}): Promise<
  P[]
> {
  const store = getServiceStore<P>();
  let services = await store.values();
  if (options.public) {
    // Force public only
    services = services.filter(value => value.public);
  }
  if (options.generic) {
    services = services.filter(value => value.generic);
  }
  return services;
}
