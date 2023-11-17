import { v4 } from "uuid";
import { ServiceData, Service } from "./types";
import { setService } from "./set-service";

export async function addService(data: ServiceData): Promise<Service> {
  const serviceId = v4();
  return setService({
    ...data,
    serviceId,
  });
}
