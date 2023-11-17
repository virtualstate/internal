import {getHappeningStore} from "./store";

export async function getHappening(happeningId: string) {
   const store = getHappeningStore();
   return store.get(happeningId);
}