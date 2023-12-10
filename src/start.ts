import {Config, getConfig, withConfig} from "./config";
import {isServiceWorker} from "./worker/service-worker/config";

export async function start(config?: Partial<Config>): Promise<() => Promise<void>> {
    if (config) {
        return withConfig(getConfig(config), () => start());
    }

    await import("./scheduled");
    await import("./dispatch");

    const tracing = await import("./tracing");
    let listen: { close(): Promise<void> } | undefined,
        worker: { close(): Promise<void> } | undefined;

    if (isServiceWorker()) {
        worker = await import("./worker/service-worker/main");
    } else {
        listen = await import("./listen/main");
    }

    return async function close() {
        await tracing.shutdown();
        await listen?.close();
        await worker?.close();
    }
}