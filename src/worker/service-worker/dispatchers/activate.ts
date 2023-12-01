import {dispatcher} from "../../../events/schedule/schedule";
import {createWaitUntil, ExtendableEvent} from "../../../fetch";

export interface ActivateEvent extends ExtendableEvent {

}

export const removeActivateDispatcher = dispatcher("activate", async (event, dispatch) => {
    const {
        wait,
        waitUntil
    } = createWaitUntil(event);
    await dispatch({
        ...event,
        waitUntil
    });
    await wait();
});