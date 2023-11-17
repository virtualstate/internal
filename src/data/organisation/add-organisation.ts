import { v4 } from "uuid";
import { OrganisationData, Organisation } from "./types";
import { setOrganisation } from "./set-organisation";

export async function addOrganisation(data: OrganisationData): Promise<Organisation> {
  return setOrganisation({
    ...data,
    organisationId: v4(),
    approved: false,
    approvedAt: undefined,
    approvedByUserId: undefined
  });
}
