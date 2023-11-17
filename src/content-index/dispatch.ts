import {dispatcher} from "../events/schedule/schedule";
import {createWaitUntil} from "../fetch";
import {isSignalled} from "../is";

export const removeContentDeleteDispatchFunction = dispatcher("contentdelete", async (event, dispatch) => {
    const { signal, controller } = getSignal();
    const {
        wait,
        waitUntil
    } = createWaitUntil();
    try {
        await dispatch({
            ...event,
            signal,
            waitUntil
        });
        await wait();
    } catch (error) {
        if (!signal.aborted) {
            controller?.abort(error);
        }
        throw await Promise.reject(error);
    } finally {
        if (!signal.aborted) {
            controller?.abort();
        }
        await wait();
    }

    function getSignal() {
        if (isSignalled(event)) {
            return { signal: event.signal, controller: undefined } as const;
        }
        const controller = new AbortController();
        return {
            signal: controller.signal,
            controller
        } as const;
    }
})