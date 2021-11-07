import { dispatchEvent, hasEventListener } from "../environment/environment.js";
import { getRuntimeEnvironment } from "./environment.js";
import { runWithSpan } from "../tracing/tracing.js";
import { setEnvironmentConfig } from "../config/config.js";
import { hasFlag } from "../flags/flags.js";
export async function run(config) {
    const errors = [];
    try {
        const environment = await getRuntimeEnvironment(config);
        await environment.runInAsyncScope(async () => {
            await setEnvironmentConfig(config);
            await runWithSpan("environment", { attributes: { name: environment.name } }, async () => {
                await runWithSpan("environment_configure", {}, async () => {
                    if (environment.configure) {
                        environment.configure();
                    }
                });
                await dispatchEvent({
                    type: "configure",
                    environment,
                    parallel: false
                });
                await runWithSpan("environment_post_configure", {}, () => {
                    if (environment.postConfigure) {
                        environment.postConfigure();
                    }
                });
                if (hasFlag("POST_CONFIGURE_TEST") && await hasEventListener("test")) {
                    try {
                        await dispatchEvent({
                            type: "test",
                            environment,
                            parallel: false
                        });
                    }
                    catch (error) {
                        console.error({ runnerTestError: error });
                        await Promise.reject(error);
                    }
                }
                try {
                    const event = {
                        type: "execute",
                        environment,
                        parallel: false
                    };
                    await dispatchEvent(event);
                    if (config.execute) {
                        await config.execute(event);
                    }
                    await runWithSpan("environment_wait_for_services", {}, () => environment.waitForServices());
                }
                catch (error) {
                    if (await hasEventListener("error")) {
                        await dispatchEvent({
                            type: "error",
                            error
                        });
                    }
                    else {
                        console.error(error);
                        errors.push(error);
                    }
                }
                finally {
                    await dispatchEvent({
                        type: "complete",
                        environment
                    });
                    if (environment.end) {
                        await environment.end();
                    }
                }
            });
        });
    }
    catch (error) {
        console.error(error);
        errors.push(error);
    }
    if (errors.length === 1) {
        // Bypass throw, retain original error stack
        await Promise.reject(errors[0]);
        throw "Unexpected resolution"; // We shouldn't be able to get here ever.
    }
    else if (errors.length > 1) {
        throw new AggregateError(errors);
    }
}
