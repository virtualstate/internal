import fastify, {FastifyInstance} from "fastify";
import { routes } from "./routes";
import { setupSwagger } from "./swagger";
import blippPlugin from "fastify-blipp";
import corsPlugin from "@fastify/cors";
import { getPort } from "./config";
import { fastifyRequestContext } from "@fastify/request-context";
import helmet from "@fastify/helmet";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { bearerAuthentication } from "./authentication";
import bearerAuthPlugin from "@fastify/bearer-auth";
import authPlugin from "@fastify/auth";
import { autoSeed, seed, stopData } from "../data";
import {
    commitAt, commitAuthor,
    commitMessage,
    commitShort,
    importmapRoot,
    importmapRootName,
    name,
    packageIdentifier
} from "../package";
import cookie from "@fastify/cookie";
import { isLike, ok } from "../is";
import multipart from "@fastify/multipart";
import formbody from "@fastify/formbody";
import qs from "qs";
import { REACT_CLIENT_DIRECTORY } from "../view";
import files from "@fastify/static";
import { errorHandler } from "../view/error";
import etag from "@fastify/etag";
import { parseStringFields } from "./body-parser";
import {Config, getConfig, setConfig, withConfig} from "../config";
import rawBody from "fastify-raw-body";

const { pathname } = new URL(import.meta.url);
const directory = dirname(pathname);

export async function createFastifyApplication() {
    const { COOKIE_SECRET } = process.env;

    if (!COOKIE_SECRET) {
        console.warn("Warning, COOKIE_SECRET not set in environment variables or .env");
    }

    const app = fastify({
        logger: true,
    });

    const register: (...args: unknown[]) => void = app.register.bind(fastify);

    await register(cookie, {
        secret: COOKIE_SECRET || name,
        hook: "onRequest",
        parseOptions: {},
    });
    await register(rawBody, {
        global: false
    });

    await register(multipart);
    await register(formbody, {
        parser: parseStringFields,
    });

    await register(helmet, { contentSecurityPolicy: false });

    app.addHook("preValidation", async (request, response) => {
        if (request.headers.apikey && !request.headers.authorization) {
            request.headers.authorization = `bearer ${request.headers.apikey}`;
        }
    });

    await register(fastifyRequestContext, {
        hook: "preValidation",
        defaultStoreValues: {},
    });

    app.addHook("preValidation", async (request, response) => {
        request.requestContext.set(
            "origin",
            `${request.protocol}://${request.hostname}`
        );

        response.header("X-Powered-By", packageIdentifier);

        // Some details about time since commit
        response.header("X-Source-Commit", commitShort);
        response.header("X-Source-Commit-At", commitAt);
    });

    await register(authPlugin);
    await register(bearerAuthPlugin, {
        keys: new Set<string>(),
        auth: bearerAuthentication,
        addHook: false,
    });
    app.setErrorHandler(errorHandler);

    await register(blippPlugin);
    await register(corsPlugin);

    await setupSwagger(app);

    const { routes: providedRoutes } = getConfig();

    if (providedRoutes) {
        await register(providedRoutes);
    }

    await register(routes);

    return app;
}

export async function create(config?: Partial<Config>): ReturnType<typeof createFastifyApplication> {
    if (config) {
        return withConfig(getConfig(config), () => create());
    }

    return createFastifyApplication();
}

export async function start(config?: Partial<Config>): Promise<() => Promise<void>> {
    if (config) {
        return withConfig(getConfig(config), () => start());
    }

    const app = await create(config);

    // Before we start, we should seed
    await autoSeed();

    const port = getPort();

    const {
        LISTEN_HOST
    } = process.env;

    await app.listen({ port, host: LISTEN_HOST });

    app.blipp();

    return async () => {
        await app.close();
        // close any opened connections
        await stopData();
    };
}
