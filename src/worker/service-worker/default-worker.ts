import "./dispatchers";
import {Promise, Push} from "@virtualstate/promise";
import {WORKER_ADD_CONTEXT, WORKER_BREAK, WORKER_INITIATED, WORKER_TERMINATE} from "./constants";
import {parentPort, workerData} from "node:worker_threads";
import {onServiceWorkerWorkerData, ServiceWorkerWorkerData} from "./worker";
import { ok } from "../../is";
import {dispatchWorkerEvent} from "./dispatch";
import {getConfig, withConfig} from "../../config";
import {dispatchEvent} from "../../events";
import {DurableEventData} from "../../data";
import {DurableServiceWorkerRegistration} from "./container";
import {AddRoutesOptions} from "./router";

console.log("Default worker!");

try {

    const messages = new Push();

    let receivedMessage = false;

    async function cleanup() {
        parentPort.off("message", onMessage);
        messages.close();
    }

    function onMessage(message: string) {
        receivedMessage = true;
        console.log("Message for worker", message);
        if (!messages.open || message === WORKER_TERMINATE) {
            return cleanup();
        }
        messages.push(message);
    }
    parentPort.on("message", onMessage);
    console.log("Listening for messages inside worker");


    workerData.postMessage(WORKER_INITIATED);
    console.log("Initiated inside worker");

    let initiatedCount = 0;
    const initiatedInterval = setInterval(() => {
        if (receivedMessage) {
            clearInterval(initiatedInterval);
            return;
        }
        workerData.postMessage(WORKER_INITIATED);
        console.log("Initiated inside worker", initiatedCount++);
    }, 500)

    let registration: DurableServiceWorkerRegistration;

    console.log("Waiting for messages inside worker");
    for await (const message of messages) {
        console.log("Received worker message", message);
        if (message === WORKER_BREAK) {
            continue;
        }

        ok<ServiceWorkerWorkerData>(message);
        await onServiceWorkerMessage(message);

        console.log("Breaking worker!");
        workerData.postMessage(WORKER_BREAK);
    }

    workerData.postMessage(WORKER_TERMINATE);

    async function addServiceWorkerRoutes(rules: AddRoutesOptions) {
        const array = Array.isArray(rules) ? rules : [rules];
    }

    async function onServiceWorkerMessage(message: ServiceWorkerWorkerData) {
        const { serviceWorkerId } = message;
        ok(serviceWorkerId);

        await withConfig({
            addServiceWorkerRoutes,
            dispatchEvent(event: DurableEventData) {
                return dispatchEvent({
                    ...event,
                    serviceWorkerId
                })
            }
        }, async () => {
            if (!registration) {
                registration = await onServiceWorkerWorkerData(message);
            } else {
                ok(message.serviceWorkerId === registration.durable.serviceWorkerId);
                if (message.event) {
                    await dispatchWorkerEvent(message.event, message);
                }
            }
        })
    }

} catch (error) {
    console.error("Error in worker", error)
}

