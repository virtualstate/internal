import {Authsignal, AuthsignalOptions} from "@authsignal/browser";
import {ok} from "./utils";
import type {Passkey} from "@authsignal/browser/dist/passkey";
import type {PasskeyApiClient} from "@authsignal/browser/dist/api";
import {startAuthentication, startRegistration} from "@simplewebauthn/browser";
import {AuthenticationExtensionsClientInputs} from "@simplewebauthn/typescript-types/dist/dom";
import {PublicKeyCredentialRequestOptionsJSON} from "@simplewebauthn/typescript-types";
import {AddAuthenticatorRequest, VerifyRequest} from "@authsignal/browser/dist/api/types";

interface AuthsignalMeta {
    tenantId: string;
    baseUrl: string;
    trackUrl: string;
}

function getMetaElements(element: HTMLElement) {
    const tenantIdMeta = element.querySelector("meta[name=authsignal-tenant-id]");
    const regionMeta = element.querySelector("meta[name=authsignal-region]");
    const trackMeta = element.querySelector("meta[name=authsignal-track-url]");
    return {
        tenantIdMeta,
        regionMeta,
        trackMeta
    }
}

export function isAuthsignalMeta(element = document.body) {
    const {
        tenantIdMeta,
        trackMeta,
        regionMeta
    } = getMetaElements(element);
    return !!(
        tenantIdMeta &&
        trackMeta &&
        regionMeta
    );
}

export function getAuthsignalMeta(element = document.body): AuthsignalMeta {
    const {
        tenantIdMeta,
        trackMeta,
        regionMeta
    } = getMetaElements(element);

    ok<HTMLMetaElement>(tenantIdMeta);
    ok<HTMLMetaElement>(regionMeta);
    ok<HTMLMetaElement>(trackMeta);

    return {
        tenantId: tenantIdMeta.content,
        baseUrl: regionMeta.content,
        trackUrl: trackMeta.content
    };
}

const clients = new WeakMap<AuthsignalMeta, AuthsignalCustomClient>();

export function getAuthsignalClient(meta = getAuthsignalMeta()): AuthsignalCustomClient {
    const existing = clients.get(meta);
    if (existing) return existing;
    const { tenantId, baseUrl } = meta;
    const client = new AuthsignalCustomClient({ tenantId, baseUrl });
    clients.set(meta, client);
    return client;
}

export interface PasskeyOptions {
    email?: string;
    payment?: boolean;
    register?: boolean;
}

export async function authsignalPasskey({ email, payment, register }: PasskeyOptions, meta: AuthsignalMeta = getAuthsignalMeta()) {
    const { baseUrl } = meta;

    const authenticatorUserId = payment ?
        crypto.randomUUID() :
        undefined;
    const authenticatorType = payment ? "payment" : "user";

    const userName = email ?? authenticatorUserId;
    ok(userName, "Expected email or payment");

    const {
        token,
        enrolledVerificationMethods,
        redirectUrl
    } = await track();


    const accessToken = await getAccessToken();
    const credential = await getCredential()

    const redirectingUrl = new URL(
        redirectUrl,
        location.href
    );

    for (const [key, value] of Object.entries(credential)) {
        if (typeof value !== "string") continue;
        redirectingUrl.searchParams.set(key, value);
    }

    redirectingUrl.searchParams.set("token", accessToken);

    location.href = redirectingUrl.toString();

    interface TrackResponse {
        token: string;
        enrolledVerificationMethods: string[];
        redirectUrl: string;
    }

    async function getAccessToken() {
        const isPasskeyEnrolled = !register && enrolledVerificationMethods?.includes("PASSKEY");

        const authsignal = getAuthsignalClient(meta);

        if (isPasskeyEnrolled) {
            return await authsignal.extendedPasskey.signIn({
                token
            })
        } else {
            let paymentOptions;
            if (payment) {
                paymentOptions = {
                    authenticatorSelection: {
                        userVerification: "required",
                        residentKey: "required",
                        authenticatorAttachment: "platform",
                    },
                    extensions: {
                        "payment": {
                            isPayment: true,
                        }
                    },
                }
            }
            return await authsignal.extendedPasskey.signUp({
                userName,
                token,
                ...paymentOptions
            })
        }

    }

    async function track(): Promise<TrackResponse> {
        const { trackUrl } = meta;
        const response = await fetch(
            trackUrl,
            {
                method: "POST",
                body: JSON.stringify({
                    email,
                    authenticatorUserId,
                    authenticatorType,
                    register
                }),
                headers: {
                    "Content-Type": "application/json"
                }
            },
        );
        ok(response.ok);
        return await response.json();
    }

    async function getCredential(): Promise<{ deviceId: string, credentialId: string } | undefined> {
        const response = await fetch(
            new URL(
                "/v1/user-authenticators",
                baseUrl
            ),
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );
        ok(response.ok);
        const authenticators = await response.json();
        ok(Array.isArray(authenticators));
        const found = authenticators.find(authenticator => authenticator.verificationMethod === "PASSKEY");
        return found?.webauthnCredential
    }
}

class AuthsignalCustomPasskey implements Passkey {

    base: Passkey;

    constructor(base: Passkey) {
        this.base = base;
    }

    get api(): PasskeyApiClient {
        return this.base.api;
    };

    signIn(params?: { token: string, extensions?: Record<string, unknown> }): Promise<string | undefined>;
    signIn(params?: { autofill: boolean, extensions?: Record<string, unknown> }): Promise<string | undefined>;
    async signIn(params?: {token?: string; autofill?: boolean, extensions?: Record<string, unknown> } | undefined) {
        if (params?.token && params.autofill) {
            throw new Error("Autofill is not supported when providing a token");
        }

        const optionsResponse = await this.api.authenticationOptions({token: params?.token});

        try {
            const givenOptions: PublicKeyCredentialRequestOptionsJSON = optionsResponse.options;
            const options: PublicKeyCredentialRequestOptionsJSON = {
                ...givenOptions,
                extensions: {
                    ...givenOptions.extensions,
                    ...params.extensions
                }
            }
            const authenticationResponse = await startAuthentication(options, params?.autofill);
            const verifyResponse = await this.api.verify({
                challengeId: optionsResponse.challengeId,
                authenticationCredential: authenticationResponse,
                token: params?.token,
            });
            return verifyResponse?.accessToken;
        } catch (error) {
            console.error(error);
        }
    }

    async signUp({userName, token, extensions, authenticatorSelection}: { userName: string, token: string, extensions?: Record<string, unknown>, authenticatorSelection?: Record<string, unknown> }): Promise<string | undefined> {
        const optionsResponse = await this.api.registrationOptions({userName, token});
        try {
            const options = {
                ...optionsResponse.options,
                authenticatorSelection: {
                    ...optionsResponse.options.authenticatorSelection,
                    ...authenticatorSelection
                },
                extensions: {
                    ...optionsResponse.options.extensions,
                    ...extensions
                }
            };
            console.log(options);
            const registrationResponse = await startRegistration(options);
            const addAuthenticatorResponse = await this.api.addAuthenticator({
                challengeId: optionsResponse.challengeId,
                registrationCredential: registrationResponse,
                token,
            });
            return addAuthenticatorResponse?.accessToken;
        } catch (error) {
            console.error(error);
        }
    }
}

class AuthsignalCustomClient extends Authsignal {

    extendedPasskey: AuthsignalCustomPasskey;

    constructor(options: AuthsignalOptions) {
        super(options);
        this.extendedPasskey = new AuthsignalCustomPasskey(this.passkey);
        const passkey: unknown = this.extendedPasskey;
        ok<Passkey>(passkey);
        this.passkey = passkey;
    }

}