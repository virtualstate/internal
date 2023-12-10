import {ok} from "../is";
import {requestContext} from "@fastify/request-context";
import {
    SERVICE_WORKER_LISTEN_HOSTNAME,
    SERVICE_WORKER_LISTEN_PORT,
    SERVICE_WORKER_ORIGIN,
    SERVICE_WORKER_URL
} from "../config";

export function getPort() {
    const origin = getEnvironmentOrigin();
    if (origin) {
        const { port } = new URL(origin);
        if (port) {
            return +port;
        }
    }
    const env = process.env.PORT;
    if (env && /^\d+$/.test(env)) {
        return +env;
    }
    return 3000;
}

function getServiceWorkerOrigin(mainOrigin: string) {
    if (SERVICE_WORKER_URL) {
        if (SERVICE_WORKER_ORIGIN) {
            return SERVICE_WORKER_ORIGIN;
        }
        if (SERVICE_WORKER_LISTEN_PORT) {
            const instance = new URL(mainOrigin);
            instance.port = SERVICE_WORKER_LISTEN_PORT;
            if (SERVICE_WORKER_LISTEN_HOSTNAME) {
                instance.hostname = SERVICE_WORKER_LISTEN_HOSTNAME;
            }
            return instance.toString();
        }
    }
}

function getEnvironmentOrigin() {
    if (process.env.ORIGIN_URL) {
        return process.env.ORIGIN_URL;
    }

    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`
    }

    if (process.env.API_URL) {
        return process.env.API_URL;
    }

    if (process.env.SERVER_EXTERNAL_URL_ORIGIN) {
        return process.env.SERVER_EXTERNAL_URL_ORIGIN;
    }

    const origin = requestContext.get("origin");

    if (origin) {
        return origin;
    }

    return undefined;
}

function getMainOrigin() {
    const origin = getEnvironmentOrigin();

    if (origin) {
        return origin;
    }

    const port = getPort();

    ok(port);

    return `http://localhost:${port}`;
}

export function getOrigin() {
    const mainOrigin = getMainOrigin();
    return getServiceWorkerOrigin(mainOrigin) ?? mainOrigin;
}