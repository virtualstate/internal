import {isLike, isNumberString, ok} from "../is";
import {
    AuthenticationState, DEFAULT_COOKIE_STATE_EXPIRES_MS,
    getAccessToken as getAccessTokenDocument,
    getAuthenticationState,
    setAuthenticationState as setAuthenticationStateData,
    getPartner as getPartnerDocument,
    getUser,
    User, getExpiresAt,
} from "../data";
import {
    DoneFuncWithErrOrRes,
    FastifyInstance,
    FastifyReply,
    FastifyRequest,
} from "fastify";
import { FastifyAuthFunction } from "@fastify/auth";
import {
    AUTHORIZED_ACCESS_TOKEN_KEY,
    AUTHORIZED_PARTNER,
    setAuthenticationState,
    setAuthorizedForPartnerId,
    setUser,
} from "../authentication";
import { preHandlerHookHandler } from "fastify/types/hooks";
import accepts from "accepts";
import { logoutResponse } from "./auth/logout";
import "@fastify/cookie";
import "fastify-raw-body";
import {verifyTokenWithKeys, VerifyWithKeyOptions} from "../authentication/token-signature";

export const NOT_AUTHORIZED_ERROR_MESSAGE = "not authorized";
export const NOT_ANONYMOUS_ERROR_MESSAGE = "not anonymous";

export async function bearerAuthentication(
    key: string,
    request: FastifyRequest
): Promise<boolean> {
    if (!key) return false;
    const token = await getAccessTokenDocument(key);
    if (!token) return false;
    if (token.disabledAt) return false;

    if (token.partnerId) {
        setAuthorizedForPartnerId(token.partnerId);
        const partner = await getPartnerDocument(token.partnerId);
        ok(partner, "Expected partner to be available");
        request.requestContext.set(AUTHORIZED_PARTNER, partner);
        if (process.env.VOUCH_REQUIRE_PARTNER_APPROVAL) {
            if (!partner.approved) return false;
        }
    }

    request.requestContext.set("accessTokenAuthentication", true);
    request.requestContext.set("accessToken", token);
    request.requestContext.set(AUTHORIZED_ACCESS_TOKEN_KEY, token.accessToken);

    return true;
}

function getCookieState(request: FastifyRequest) {
    return request.cookies.state;
}

function getAccessToken(request: FastifyRequest) {
    ok<{ accessToken?: string }>(request.query);
    return request.query.accessToken;
}

function getAuthorizationHeader(request: FastifyRequest) {
    return request.headers.authorization;
}

export const allowUnauthenticated: FastifyAuthFunction = (
    request,
    response,
    done
) => {
    const value = !!(
        getCookieState(request) ||
        getAuthorizationHeader(request) ||
        getAccessToken(request)
    );
    if (value) {
        return done(Error(NOT_ANONYMOUS_ERROR_MESSAGE));
    }
    return done();
};

export const accessToken: FastifyAuthFunction = async (request) => {
    const accessToken = getAccessToken(request);
    if (!accessToken) {
        throw new Error(NOT_AUTHORIZED_ERROR_MESSAGE);
    }
    const success = await bearerAuthentication(accessToken, request);
    if (!success) {
        throw new Error(NOT_AUTHORIZED_ERROR_MESSAGE);
    }
};

function createCookieAuth(fastify: FastifyInstance): FastifyAuthFunction {
    return async (request) => {
        const signedStateId = getCookieState(request);
        ok(typeof signedStateId === "string", NOT_AUTHORIZED_ERROR_MESSAGE);
        const unsignedCookie = fastify.unsignCookie(signedStateId);
        ok(unsignedCookie.valid, NOT_AUTHORIZED_ERROR_MESSAGE);
        let state = await getAuthenticationState(unsignedCookie.value);
        ok(state, NOT_AUTHORIZED_ERROR_MESSAGE);
        ok(state.type === "cookie", NOT_AUTHORIZED_ERROR_MESSAGE);
        const timeUntilExpiry = new Date(state.expiresAt).getTime() - Date.now();
        const resetExpiry = timeUntilExpiry < (DEFAULT_COOKIE_STATE_EXPIRES_MS / 2);
        // 👍
        // { timeUntilExpiry: 19085757, resetExpiry: true }
        // { timeUntilExpiry: 1209592013, resetExpiry: false }
        // { timeUntilExpiry: 1209559680, resetExpiry: false }
        // console.log({ timeUntilExpiry, resetExpiry  })
        if (resetExpiry) {
            state = await setAuthenticationStateData({
                ...state,
                expiresAt: getExpiresAt(DEFAULT_COOKIE_STATE_EXPIRES_MS)
            });
        }
        setAuthenticationState(state);
        if (state.userId) {
            const user: User | undefined = await getUser(state.userId);
            ok(user, NOT_AUTHORIZED_ERROR_MESSAGE);
            setUser(user);
        }
    };
}

export function getFastifyVerifyBearerAuth(
    fastify: FastifyInstance
): FastifyAuthFunction {
    const verifyBearerAuth = fastify.verifyBearerAuth;
    ok(
        verifyBearerAuth,
        "Expected verifyBearerAuth, please setup @fastify/bearer-auth"
    );
    return verifyBearerAuth;
}

export interface FastifyAuthOptions {
    relation?: "and" | "or";
    run?: "all";
}

export function getFastifyAuth(fastify: FastifyInstance) {
    const auth = fastify.auth;
    ok(auth, "Expected auth, please setup @fastify/auth");
    return auth;
}

export interface AuthInput extends FastifyAuthOptions {
    internal?: boolean;
    unauthenticated?: boolean;
    /**
     * @deprecated use unauthenticated: true
     */
    anonymous?: boolean;
}

export function isHTMLResponse(request: FastifyRequest) {
    const acceptValue = request.headers.accept;
    if (!acceptValue) return false;
    // json is the default for server, but if the client prefers html
    // that is what we are looking for
    const accept = accepts(request.raw).type(["json", "html"]);
    return accept === "html";
}

type TokenAuthOptions = Omit<VerifyWithKeyOptions, "token">;

function getInternalTokenKeys() {
    return Object.entries(process.env)
        .filter(entry => /^INTERNAL_KEY_SECRET(_\d+)?$/.test(entry[0]))
        .map(entry => entry[1]);
}

function createVerifyTokenAuth(options: TokenAuthOptions): FastifyAuthFunction {
    return async (request) => {
        const token = getAccessToken(request);
        await verifyWithToken(options, token);
    }
}

async function verifyWithToken(options: TokenAuthOptions, token?: string) {
    ok(token, NOT_AUTHORIZED_ERROR_MESSAGE);
    const verified = await verifyTokenWithKeys({
        ...options,
        token
    });
    ok(verified, NOT_AUTHORIZED_ERROR_MESSAGE);
}

function createUpstashSignatureAuth(): FastifyAuthFunction {
    const {
        QSTASH_URL,
        QSTASH_CURRENT_SIGNING_KEY,
        QSTASH_NEXT_SIGNING_KEY,
        QSTASH_CLOCK_TOLERANCE,
        QSTASH_ISSUER,
        QSTASH_SUBJECT
    } = process.env;
    ok(QSTASH_CURRENT_SIGNING_KEY, "Expected QSTASH_CURRENT_SIGNING_KEY");
    ok(QSTASH_NEXT_SIGNING_KEY, "Expected QSTASH_NEXT_SIGNING_KEY");
    const clockTolerance = isNumberString(QSTASH_CLOCK_TOLERANCE) ? +QSTASH_CLOCK_TOLERANCE : 0;
    const options: TokenAuthOptions = {
        keys: [
            QSTASH_CURRENT_SIGNING_KEY,
            QSTASH_NEXT_SIGNING_KEY,
        ],
        url: QSTASH_URL,
        clockTolerance,
        issuer: QSTASH_ISSUER || "Upstash",
        subject: QSTASH_SUBJECT,
    }
    return async (request) => {
        const upstashSignature = request.headers["upstash-signature"];
        ok(typeof upstashSignature === "string", NOT_AUTHORIZED_ERROR_MESSAGE)
        await verifyWithToken({
            ...options,
            body: request.rawBody ?? request.body
        }, upstashSignature);
    }
}

function isUnauthenticatedOptions(options?: AuthInput) {
    return !!(options?.anonymous || options?.unauthenticated);
}

export function authenticateSignature(
    fastify: FastifyInstance,
    options?: AuthInput
) {
    const methods: FastifyAuthFunction[] = [
        createUpstashSignatureAuth()
    ];
    return createAuthHandler(
        fastify,
        methods,
        options
    );
}

function createInternalAuth(keys: string[]) {
    const {
        INTERNAL_KEY_ISSUER,
        INTERNAL_KEY_SUBJECT
    } = process.env;
    return createVerifyTokenAuth({
        keys,
        issuer: INTERNAL_KEY_ISSUER,
        subject: INTERNAL_KEY_SUBJECT
    });
}

function createAuthHandler(fastify: FastifyInstance, methods: FastifyAuthFunction[], options?: AuthInput): preHandlerHookHandler {
    if (options?.internal) {
        const keys = getInternalTokenKeys();
        if (keys.length) {
            methods.push(createInternalAuth(keys))
        } else {
            console.warn("Warning, internal key functionality available but no INTERNAL_KEY_SECRET given");
        }
    }

    if (isUnauthenticatedOptions(options)) {
        methods.unshift(allowUnauthenticated);
    }

    const authHandler = getFastifyAuth(fastify)(methods, options);

    return function (this, request, response, done) {
        // const { pathname, searchParams } = new URL(request.url, getOrigin());
        // if (pathname === "/" && searchParams.get("auth") === "redirected") {
        //   return done();
        // }

        if (!isHTMLResponse(request)) {
            return authHandler.call(this, request, response, done);
        }

        return authHandler.call(this, request, response, function (error: unknown) {
            // console.log({
            //   error,
            //   statusCode: response.statusCode,
            //   args,
            // });
            if (!error && response.statusCode === 200) {
                return done();
            }

            logoutResponse(response).finally(() => {
                response.header("Location", "/?auth=redirected");
                response.status(302);
                response.send("Unauthenticated, redirecting...");
            });
        });
    };
}

export function authenticate(
    fastify: FastifyInstance,
    options?: AuthInput
): preHandlerHookHandler {
    const methods: FastifyAuthFunction[] = [
        createCookieAuth(fastify),
        accessToken,
        getFastifyVerifyBearerAuth(fastify),
    ];

    return createAuthHandler(
        fastify,
        methods,
        options
    );
}

export function setAuthenticationStateCookie(response: FastifyReply, { stateId, expiresAt }: AuthenticationState) {
    response.setCookie("state", stateId, {
        path: "/",
        signed: true,
        expires: new Date(expiresAt),
    });
}