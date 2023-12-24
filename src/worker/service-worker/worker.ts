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
import {Config, Service} from "./configure/types";
import {globalFetch} from "./global-fetch";
import { createServiceWorkerWorkerFetch } from "./worker-fetch";
import {importWorkerExtensions} from "./worker-extensions";
import {DurableServiceWorkerScope} from "./types";
import {ok} from "../../is";

declare var _ORIGINAL_GLOBAL_FETCH: typeof fetch;

export interface ServiceWorkerWorkerData {
    serviceWorkerId: string;
    event?: DurableEventData;
    port?: NodeMessagePort;
    channel?: NodeMessageChannel;
    context?: Record<string, unknown[]>;
    config?: Config;
    service?: Service;
}

export async function onServiceWorkerWorkerData(data: ServiceWorkerWorkerData, internalBucket = getInternalStorageBucket()): Promise<DurableServiceWorkerRegistration> {
    const registration = await getDurableServiceWorkerRegistration(internalBucket, data.serviceWorkerId, {
        isCurrentGlobalScope: true
    });
    const { protocol, origin } = new URL(registration.durable.baseURL || registration.durable.url);

    let imported: unknown = undefined;

    function getServiceWorkerModuleExports() {
        return imported;
    }

    ok<DurableServiceWorkerScope["addEventListener"]>(addEventListener);
    ok<DurableServiceWorkerScope["removeEventListener"]>(removeEventListener);
    const globalSelf: unknown = globalThis;
    ok<DurableServiceWorkerScope>(globalSelf);

    const scope: DurableServiceWorkerScope & Record<string, unknown> = {
        _ORIGINAL_GLOBAL_FETCH: globalFetch,
        _GLOBAL_getServiceWorkerModuleExports: getServiceWorkerModuleExports,
        registration,
        caches,
        index,
        sync,
        periodicSync,
        serviceWorker,
        self: globalSelf,
        isSecureContext: protocol === "https:",
        origin: origin || getOrigin(),
        addEventListener,
        removeEventListener,
        fetch: createServiceWorkerWorkerFetch(data, registration)
    }

    Object.assign(globalThis, scope);

    await import("./dispatchers");
    await importWorkerExtensions(data.config, data.config.extensions, scope);
    const url = new URL(registration.durable.url, registration.durable.baseURL);
    url.searchParams.set("importCacheBust", Date.now().toString());
    imported = await import(url.toString());

    if (Array.isArray(data.service?.url)) {
        const rest = data.service.url.slice(1);
        await importWorkerExtensions(data.config, rest, scope);
    }

    if (registration.durable.registrationState === "pending" || registration.durable.registrationState === "installing") {
        try {
            // console.log("Installing service worker");
            await setRegistrationStatus( "installing");
            await dispatchEvent({
                type: "dispatch",
                dispatch: "install",
                entrypoint: "install",
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
                type: "dispatch",
                dispatch: "activate",
                entrypoint: "activate",
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
            type: "dispatch",
            dispatch: "activated",
            entrypoint: "activated",
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

