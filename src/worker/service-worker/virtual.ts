import {virtual} from "../../events/virtual/virtual";

export async function * generateVirtualServiceWorkerEvents() {
    // const store = getServiceWorkerRegistrationStore();
    // for await (const { serviceWorkerId } of store) {
    //     // TODO Generate per service worker some events :)
    // }
}

export const removeServiceWorkerVirtualFunction = virtual(generateVirtualServiceWorkerEvents);
