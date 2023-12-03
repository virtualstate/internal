import {DurableServiceWorkerRegistration} from "../../../worker";
import {dispatchEvent} from "../../../events";

export async function waitForServiceWorker(registration: DurableServiceWorkerRegistration) {
    if (registration.active) {
        return registration.active;
    }
    // Send a push event to the worker to ensure it is activated
    await dispatchEvent({
        type: "push",
        serviceWorkerId: registration.durable.serviceWorkerId,
        schedule: {
            immediate: true
        }
    });
    await registration.update();
    return waitForServiceWorker(registration);
}