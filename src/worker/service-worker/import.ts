import {serviceWorker} from "./container";
import {onServiceWorkerWorkerData} from "./worker";

/**
 * Use this function to import a service worker script into the global scope.
 *
 * Only one service worker is expected to be imported in a global scope.
 *
 * @param url
 */
export async function importServiceWorker(url: string) {
    const registration = await serviceWorker.register(url);

    await onServiceWorkerWorkerData({
        serviceWorkerId: registration.durable.serviceWorkerId
    });

    return registration;
}