import {addEventListener, dispatchEvent, removeEventListener} from "../environment/environment";
import {createFlag, resetFlag} from "../flags/config";
import {hasFlag, removeFlag, setFlag} from "../flags/flags";
import {v4} from "uuid";

addEventListener("configure", () => createFlag("FLAG"));

addEventListener("test", async function configure() {
  if (hasFlag("FLAG")) {
    throw new Error("Expected flag to be disabled by default");
  }

  setFlag("FLAG")
  if (!hasFlag("FLAG")) {
    throw new Error("Expected flag to exist after being set");
  }

  const id = v4();
  const childEvent = `child-event-${id}`;

  const childEventHandler = () => {
    if (!hasFlag("FLAG")) {
      throw new Error("Expected flag to exist in child event");
    }
  };
  addEventListener(childEvent, childEventHandler)

  await dispatchEvent({ type: childEvent })
  removeEventListener(childEvent, childEventHandler);

  resetFlag("FLAG")
  if (hasFlag("FLAG")) {
    throw new Error("Expected reset to remove flag");
  }

  createFlag("FLAG")
  if (!hasFlag("FLAG")) {
    throw new Error("Expected flag to be retained after reset + creation with no remove")
  }

  removeFlag("FLAG");
  if (hasFlag("FLAG")) {
    throw new Error("Expected removal to remove flag!");
  }

  setFlag("FLAG")
  if (!hasFlag("FLAG")) {
    throw new Error("Expected set flag to again re-create the flag");
  }

  // Reset to deleted
  removeFlag("FLAG");
});
