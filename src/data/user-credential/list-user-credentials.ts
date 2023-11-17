import {UserCredential} from "./types";
import {getUserCredentialStore} from "./store";

export async function listUserCredentials(userId: string): Promise<
    UserCredential[]
> {
  const store = getUserCredentialStore(userId);
  return store.values();
}