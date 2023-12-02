import {dispatcher} from "../../../events/schedule/schedule";
import {createWaitUntil, ExtendableEvent} from "../../../fetch";
import {addRoutes, AddRoutesOptions} from "../router";
import {skipWaiting} from "../skip-waiting";

export interface InstallEvent extends ExtendableEvent {
    skipWaiting(): void;
    addRoutes(rules: AddRoutesOptions): Promise<void> | unknown;
}

export const removeInstallDispatcher = dispatcher("install", async (event, dispatch) => {
    const {
        wait,
        waitUntil
    } = createWaitUntil(event);
    await dispatch({
        ...event,
        waitUntil,
        skipWaiting,
        addRoutes
    })
    await wait();
});