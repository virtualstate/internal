import {
  ExternalUserReferenceData,
} from "./types";
import {getExternalReferenceKey, getExternalUserReferenceStore, getUserStore} from "./store";
import {getExternalReference} from "./get-user";
import {AuthenticationStateType} from "../authentication-state";

export async function deleteUser(userId: string) {
  const store = getUserStore();
  await store.delete(userId);
}

export async function deleteExternalUser(
  data: ExternalUserReferenceData
) {
  const { externalId, externalType } = data;
  const reference = await getExternalReference(externalType, externalId);
  if (!reference) return;
  await deleteUser(reference.userId);
  await deleteExternalReference(externalType, externalId);
}

export async function deleteExternalReference(externalType: AuthenticationStateType, externalId: string) {
  const store = getExternalUserReferenceStore();
  const key = getExternalReferenceKey(externalType, externalId);
  await store.delete(key);
}
