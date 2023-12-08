import "./dispatchers";
import {Push} from "@virtualstate/promise";
import {WORKER_BREAK, WORKER_ERROR, WORKER_INITIATED, WORKER_TERMINATE} from "./constants";
import {parentPort, workerData} from "node:worker_threads";
import {onServiceWorkerWorkerData, ServiceWorkerWorkerData} from "./worker";
import { ok } from "../../is";
import {dispatchWorkerEvent} from "./dispatch";
import {DurableServiceWorkerRegistration} from "./container";
import {listTransferable} from "./transferrable";

// console.log("Default worker!");

try {

    const messages = new Push();

    let receivedMessage = false;

    function cleanup() {
        parentPort.off("message", onMessage);
        messages.close();
    }

    function onMessage(message: string) {
        try {
            receivedMessage = true;
            // console.log("Message for worker", message);
            if (message === WORKER_ERROR) {
                // console.log("Received worker error message");
                return cleanup()
            }
            if (!messages.open || message === WORKER_TERMINATE) {
                return cleanup();
            }
            messages.push(message);
        } catch (error) {
            console.error("Uncaught onMessage handler", error);
            postMessage(WORKER_ERROR)
        }
    }
    parentPort.on("message", onMessage);
    // console.log("Listening for messages inside worker");


    postMessage(WORKER_INITIATED);
    // console.log("Initiated inside worker");

    let initiatedCount = 0;
    const initiatedInterval = setInterval(() => {
        if (receivedMessage) {
            clearInterval(initiatedInterval);
            return;
        }
        postMessage(WORKER_INITIATED);
        // console.log("Initiated inside worker", initiatedCount++);
    }, 500)

    let registration: DurableServiceWorkerRegistration;

    // console.log("Waiting for messages inside worker");
    for await (const message of messages) {
        // console.log("Received worker message", message);
        if (message === WORKER_BREAK) {
            continue;
        }

        ok<ServiceWorkerWorkerData>(message);
        try {
            await onServiceWorkerMessage(message);
        } catch (error) {
            // console.error("worker error", error);
            postMessage(WORKER_ERROR);
            break;
        }

        // console.log("Breaking worker!");
        postMessage(WORKER_BREAK);
    }

    function postMessage(message: unknown) {
        try {
            workerData.postMessage(message, listTransferable(message));
        } catch (error) {
            console.error("Failed to postMessage");
        }
    }

    async function onServiceWorkerMessage(message: ServiceWorkerWorkerData) {
        const { serviceWorkerId } = message;
        ok(serviceWorkerId);

        if (!registration) {
            registration = await onServiceWorkerWorkerData(message);
        } else {
            ok(message.serviceWorkerId === registration.durable.serviceWorkerId);
            if (message.event) {
                await dispatchWorkerEvent(message.event, message);
            }
        }
    }

} catch (error) {
    console.error("Error in worker", error)
}

