import {
    dispatchDurableServiceWorkerRegistrationUpdate,
    DurableServiceWorkerRegistration,
    DurableServiceWorkerRegistrationData,
    DurableServiceWorkerRegistrationState,
    getDurableServiceWorkerRegistration,
    getDurableServiceWorkerRegistrationData,
    setServiceWorkerRegistrationState
} from "./container";
import {caches} from "../../fetch";
import {index} from "../../content-index";
import {sync} from "../../sync";
import {periodicSync} from "../../periodic-sync";
import {serviceWorker} from "./container";
import {getOrigin} from "../../listen";
import {addEventListener, removeEventListener} from "../../events/schedule/schedule";
import {dispatchEvent} from "../../events";
import "../../fetch/dispatch";
import {DurableEventData} from "../../data";
import {MessagePort as NodeMessagePort, MessageChannel as NodeMessageChannel } from "node:worker_threads";
import {dispatchWorkerEvent} from "./dispatch";
import {getInternalStorageBucket} from "../../storage-buckets/internal";

export interface ServiceWorkerWorkerData {
    serviceWorkerId: string;
    event?: DurableEventData;
    port?: NodeMessagePort;
    channel?: NodeMessageChannel;
    context?: Record<string, unknown[]>;
}

export async function onServiceWorkerWorkerData(data: ServiceWorkerWorkerData, internalBucket = getInternalStorageBucket()): Promise<DurableServiceWorkerRegistration> {
    const registration = await getDurableServiceWorkerRegistration(internalBucket, data.serviceWorkerId, {
        isCurrentGlobalScope: true
    });
    const { protocol, origin } = new URL(registration.durable.baseURL || registration.durable.url);

    Object.assign(globalThis, {
        registration,
        caches,
        index,
        sync,
        periodicSync,
        serviceWorker,
        self: globalThis,
        isSecureContext: protocol === "https:",
        origin: origin || getOrigin(),
        addEventListener,
        removeEventListener
    });

    await import("./dispatchers");

    const url = new URL(registration.durable.url, registration.durable.baseURL);
    url.searchParams.set("importCacheBust", Date.now().toString());
    await import(url.toString());

    if (registration.durable.registrationState === "pending" || registration.durable.registrationState === "installing") {
        try {
            // console.log("Installing service worker");
            await setRegistrationStatus( "installing");
            await dispatchEvent({
                type: "install",
                virtual: true
            });
            // console.log("Installed service worker");
            await setRegistrationStatus( "installed");
        } catch (error) {
            console.error("Error installing service worker", error);
            await setRegistrationStatus( "pending");
        }
    }
    if (registration.durable.registrationState === "installed" || registration.durable.registrationState === "activating") {
        try {
            await setRegistrationStatus( "activating");
            await dispatchEvent({
                type: "activate",
                virtual: true
            });
            await setRegistrationStatus( "activated");
        } catch {
            await setRegistrationStatus("installed");
        }
    }
    // console.log(registration.durable.registrationState);
    if (registration.durable.registrationState === "activated") {
        await dispatchEvent({
            type: "activated",
            virtual: true
        });

        if (data.event) {
            await dispatchWorkerEvent(data.event, data);
        }
    }

    return registration;

    async function setRegistrationStatus(status: DurableServiceWorkerRegistrationState) {
        const next = await setServiceWorkerRegistrationState(internalBucket, registration.durable.serviceWorkerId, status);
        // TODO change to an event
        await registration.update();
        return dispatchRegistrationUpdate(next);
    }

    async function dispatchRegistrationUpdate(update?: DurableServiceWorkerRegistrationData) {
        await dispatchDurableServiceWorkerRegistrationUpdate(
            update ?? await getDurableServiceWorkerRegistrationData(internalBucket, registration.durable.serviceWorkerId),
            {
                virtual: true
            }
        );
    }
}