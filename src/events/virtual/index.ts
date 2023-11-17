import { generateVirtualEvents } from "./virtual";
import { on } from "../schedule";
import { limited } from "../../limited";
import { dispatchScheduledDurableEvents } from "../schedule/dispatch-scheduled";

export * from "./virtual";

const VIRTUAL = "virtual" as const;

export async function onVirtualEvent() {
    for await (const events of generateVirtualEvents()) {
        await limited(
            events.map(event => () => dispatchScheduledDurableEvents({
                event
            }))
        );
    }
}

export const removeVirtualScheduledFunction = on(VIRTUAL, onVirtualEvent);