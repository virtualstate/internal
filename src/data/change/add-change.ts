import { v4 } from "uuid";
import { ChangeData, Change } from "./types";
import { setChange } from "./set-change";

export async function addChange(data: ChangeData): Promise<Change> {
  const changeId = v4();
  return setChange({
    ...data,
    changeId,
  });
}
