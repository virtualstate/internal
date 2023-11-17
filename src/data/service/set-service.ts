import { Service, ServiceData } from "./types";
import { getServiceStore } from "./store";

export async function setService(
  data: ServiceData & Pick<Service, "serviceId"> & Partial<Service>
): Promise<Service> {
  const store = await getServiceStore();
  const updatedAt = new Date().toISOString();
  const document: Service = {
    createdAt: data.createdAt || updatedAt,
    ...data,
    updatedAt,
  };
  await store.set(data.serviceId, document);
  return document;
}