import {HappeningEventData} from "../../../../client";
import {DateTime} from "luxon";
import {useHappening, useTimezone} from "./context";


export function HappeningAt() {
    const happening = useHappening();
    const timezone = useTimezone();
    let message = "This event is happening";
    if (happening.startedAt) {
        message = `Started at ${happening.startAt}`
    } else if (happening.startAt) {
        message = `Starts at ${happening.startAt}`
    } else if (happening.endedAt) {
        message = `Ended at ${happening.endedAt}`
    } else if (happening.endAt) {
        message = `Ends at ${happening.endAt}`
    }
    return (
        <div>
            {message}
        </div>
    )
}