import {dispatcher} from "../../../events/schedule/schedule";
import {createWaitUntil, ExtendableEvent} from "../../../fetch";

export interface InstallEvent extends ExtendableEvent {
    skipWaiting(): void;
}

export const removeInstallDispatcher = dispatcher("install", async (event, dispatch) => {
    const {
        wait,
        waitUntil
    } = createWaitUntil(event);
    await dispatch({
        ...event,
        waitUntil,
        skipWaiting() {
            // TODO noop
        }
    })
    await wait();
});