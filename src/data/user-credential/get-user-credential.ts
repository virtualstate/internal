import {getUserCredentialStore} from "./store";
import {UserCredential, UserCredentialIdentifiers} from "./types";

export async function getUserCredential(data: UserCredentialIdentifiers): Promise<UserCredential | undefined> {
  const store = await getUserCredentialStore(data.userId);
  return store.get(data.userCredentialId);
}