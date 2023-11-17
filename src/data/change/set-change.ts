import { Change, ChangeData } from "./types";
import { getChangeStore } from "./store";
import {v4} from "uuid";

export async function setChange(
  data: ChangeData & Partial<Change>
): Promise<Change> {
  const updatedAt = new Date().toISOString();
  const changeId = data.changeId || v4();
  const status = data.status || "pending";
  const document: Change = {
    createdAt: data.createdAt || updatedAt,
    changeId,
    ...data,
    status,
    updatedAt,
  };
  const store = await getChangeStore(document);
  await store.set(data.changeId, document);
  return document;
}