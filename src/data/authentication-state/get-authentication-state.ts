import { getAuthenticationStateStore } from "./store";

export async function getAuthenticationState(stateId: string) {
  const store = getAuthenticationStateStore();
  return store.get(stateId);
}
