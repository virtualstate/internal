import { v4 } from "uuid";
import { Organisation, PartialOrganisation } from "./types";
import { getOrganisationStore } from "./store";

export async function setOrganisation(
  data: PartialOrganisation
): Promise<Organisation> {
  const store = getOrganisationStore();
  const organisationId = data.organisationId || v4();
  const updatedAt = new Date().toISOString();
  const createdAt = data.createdAt || updatedAt;
  const organisation: Organisation = {
    approved: false,
    approvedAt: undefined,
    approvedByUserId: undefined,
    ...data,
    organisationId,
    createdAt,
    updatedAt,
  };
  await store.set(organisationId, organisation);
  return organisation;
}
