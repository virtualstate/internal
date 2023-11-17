import {getHappeningStore} from "./store";
import {getTopHappeningTree} from "./get-happening-tree";
import {HappeningTree} from "./types";
import {ok} from "../../is";

export async function deleteHappening(happeningId: string) {
   const store = getHappeningStore();
   return store.delete(happeningId);
}

export async function deleteHappeningTree(happeningId: string) {
   const tree = await getTopHappeningTree(happeningId);
   const identifiers = [...new Set(getIdentifiers(tree))];
   ok(identifiers.includes(happeningId));
   await Promise.all(
       identifiers.map(deleteHappening)
   );

   function getIdentifiers(tree: HappeningTree): string[] {
      return [
         tree.id,
         ...tree.children.flatMap<string>(getIdentifiers)
      ];
   }
}