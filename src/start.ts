import {Config, getConfig, withConfig} from "./config";

export async function start(config?: Partial<Config>): Promise<() => Promise<void>> {
    if (config) {
        return withConfig(getConfig(config), () => start());
    }

    await import("./scheduled");
    await import("./dispatch");

    const tracing = await import("./tracing");
    const listen = await import("./listen/main");
    const worker = await import("./worker/service-worker/main");

    return async function close() {
        await listen.close();
        await tracing.shutdown();
        await worker.close();
    }
}