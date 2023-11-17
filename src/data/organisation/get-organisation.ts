import { getOrganisationStore } from "./store";
import {Organisation} from "./types";

export function getOrganisation<O extends Organisation = Organisation>(organisationId: string) {
  const store = getOrganisationStore<O>();
  return store.get(organisationId);
}
