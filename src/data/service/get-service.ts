import { getServiceStore } from "./store";
import {Service} from "./types";

export function getService<P extends Service = Service>(id: string) {
  const store = getServiceStore<P>();
  return store.get(id);
}
