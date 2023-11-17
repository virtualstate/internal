import { Organisation } from "./types";
import { getOrganisationStore } from "./store";

export interface ListOrganisationsInput {
  authorizedOrganisationId?: string;
}

export async function listOrganisations<O extends Organisation = Organisation>({
  authorizedOrganisationId,
}: ListOrganisationsInput = {}): Promise<O[]> {
  const store = getOrganisationStore<O>();
  const organisations = await store.values();
  return organisations.filter(
    (organisation) =>
      organisation.approvedAt ||
      organisation.organisationId === authorizedOrganisationId
  );
}
