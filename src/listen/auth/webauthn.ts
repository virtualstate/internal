import {FastifyInstance, FastifyReply} from "fastify";
import {authenticate, setAuthenticationStateCookie} from "../authentication";
import {
    generateAuthenticationOptions,
    GenerateAuthenticationOptionsOpts,
    generateRegistrationOptions, verifyAuthenticationResponse,
    verifyRegistrationResponse
} from "@simplewebauthn/server";
import {name} from "../../package";
import {listUserCredentials, setUserCredential, UserCredential} from "../../data/user-credential";
import {getMaybeAuthenticationState, getMaybeUser} from "../../authentication";
import {createHash} from "crypto";
import {
    AuthenticationResponseJSON, PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialDescriptorFuture, PublicKeyCredentialRequestOptionsJSON,
    RegistrationResponseJSON
} from "@simplewebauthn/typescript-types";
import {GenerateRegistrationOptionsOpts} from "@simplewebauthn/server/dist/registration/generateRegistrationOptions";
import {
    addAuthenticationState,
    addCookieState,
    addExternalUser, AuthenticationRole,
    AuthenticationState, AuthenticationStateData,
    deleteAuthenticationState,
    getAuthenticationState, getExchangeStateURL, getExternalReference, getExternalUser,
    getUser, getUserAuthenticationRoleForUser,
    setAuthenticationState, setExternalReference, UntypedAuthenticationStateData
} from "../../data";
import {isNumberString, ok} from "../../is";
import base64 from "@hexagon/base64";
import fromArrayBuffer = base64.fromArrayBuffer;
import toArrayBuffer = base64.toArrayBuffer;
import {getOrigin} from "../config";
import {v4} from "uuid";
import {PaymentRequestDataJSON, PaymentRequestOptionsJSON, PaymentResponseJSON} from "./types";

const INVALID_MESSAGE = "Authentication state invalid or expired";

type WithChallenge = AuthenticationState & { challenge: string, authenticatorType?: string };

export interface WebAuthnAuthenticationOptionsBody extends Pick<UserCredential, "authenticatorType"> {
    email?: string
    redirectUrl?: string;
    register?: boolean;
    state?: string;
    registration?: Partial<GenerateRegistrationOptionsOpts>
    authentication?: Partial<GenerateAuthenticationOptionsOpts>
    payment?: Partial<PaymentRequestOptionsJSON>
}

export interface WebAuthnAuthenticationPaymentOptions {
    options: PaymentRequestOptionsJSON;
    state: string;
}

export interface WebAuthnAuthenticationResponse extends Pick<UserCredential, "authenticatorType"> {
    authentication?: {
        options: PublicKeyCredentialRequestOptionsJSON;
        state: string;
        required?: boolean
    };
    registration?: {
        options: PublicKeyCredentialCreationOptionsJSON;
        state: string;
    };
    payment?: WebAuthnAuthenticationPaymentOptions
}

export interface VerifyWebAuthnAuthenticationOptionsBody {
    registration?: RegistrationResponseJSON;
    authentication?: AuthenticationResponseJSON;
    payment?: PaymentResponseJSON;
    state: string;
}

export interface VerifyWebAuthnAuthenticationResponse {
    verified: boolean;
    redirectUrl?: string;
    userCredentialId?: string;
    userCredentialState?: string;
}

export async function webauthnRoutes(fastify: FastifyInstance) {
    const {
        WEBAUTHN_RP_NAME = name,
        WEBAUTHN_RP_ID,
        WEBAUTHN_RP_ORIGIN,
        WEBAUTHN_REDIRECT_URL = "/"
    } = process.env;

    {
        const body = {
            type: "object",
            properties: {
                email: {
                    type: "string",
                    nullable: true
                },
                authenticatorType: {
                    type: "string",
                    nullable: true
                },
                redirectUrl: {
                    type: "string",
                    nullable: true
                },
                state: {
                    type: "string",
                    nullable: true
                }
            },
            additionalProperties: true
        }
        type Schema = {
            Body: WebAuthnAuthenticationOptionsBody
        }
        const schema = {
            body,
            tags: ["system"],
        }

        fastify.post<Schema>("/webauthn/generate-options", {
            schema,
            preHandler: authenticate(fastify, { anonymous: true }),
            async handler(request, response) {
                response.send(
                    await getWebAuthnAuthenticationOptions(request.body)
                );
            }
        })
    }

    {
        const body = {
            type: "object",
            properties: {
                registration: {
                    type: "object",
                    properties: {},
                    additionalProperties: true,
                    nullable: true
                },
                authentication: {
                    type: "object",
                    properties: {},
                    additionalProperties: true,
                    nullable: true
                },
                payment: {
                    type: "object",
                    properties: {},
                    additionalProperties: true,
                    nullable: true
                }
            },
            additionalProperties: true
        };
        type Schema = {
            Body: VerifyWebAuthnAuthenticationOptionsBody
        }
        const schema = {
            body,
            tags: ["system"],
        }

        fastify.post<Schema>("/webauthn/verify", {
            schema,
            preHandler: authenticate(fastify, {anonymous: true}),
            async handler(request, response) {
                try {
                    response.send(
                        await verifyWebAuthnAuthentication(request.body, response)
                    );
                } catch (error) {
                    console.error(error);
                    response.status(400);
                    response.send({ error: error.message })
                    return;
                }
            }
        });
    }
}

export async function getWebAuthnAuthenticationOptions(body: WebAuthnAuthenticationOptionsBody): Promise<WebAuthnAuthenticationResponse> {
    const {
        WEBAUTHN_RP_NAME = name,
        WEBAUTHN_RP_ID,
        WEBAUTHN_PAYMENT_ORIGIN,
        WEBAUTHN_TIMEOUT
    } = process.env;

    const timeout = isNumberString(WEBAUTHN_TIMEOUT) ? +WEBAUTHN_TIMEOUT : 360000;

    const { email, authenticatorType, registration, authentication, redirectUrl, state: userState } = body;

    const existingUser = getMaybeUser();
    const existingUserCredentials = existingUser ? (
        (await listUserCredentials(existingUser?.userId))
            .filter(credential => credential.authenticatorType === authenticatorType)
    ): undefined;

    const externalId = createUserId();
    const reference = await getExternalReference("credential", externalId);

    // console.log({ externalId, reference });

    if (reference && existingUser && reference.userId !== existingUser.userId) {
        throw new Error("Expected user to be logged in");
    }

    const userId: string | undefined = existingUser?.userId || reference?.userId;
    const credentials = userId ? (
        existingUserCredentials ?? await listUserCredentials(userId)
    ) : []

    const registrationGenerated = await createRegistration();
    const authenticationGenerated = await createAuthentication();

    // console.log({
    //     registrationGenerated,
    //     authenticationGenerated
    // });

    let payment: WebAuthnAuthenticationPaymentOptions | undefined = undefined;
    if (authenticatorType === "payment" && body.payment?.details) {
        payment = createPayment(authenticationGenerated);
    }

    return {
        authenticatorType,
        registration: registrationGenerated,
        authentication: authenticationGenerated,
        payment,
    };

    function createPayment(authentication: WebAuthnAuthenticationResponse["authentication"]): WebAuthnAuthenticationPaymentOptions {
        const {
            challenge,
            allowCredentials,
            timeout
        } = authentication.options;
        const { hostname, origin } = new URL(getOrigin());
        const data: PaymentRequestDataJSON = {
            rpId: WEBAUTHN_RP_ID || hostname,
            challenge,
            allowCredentials,
            timeout,
            ...body.payment.data,
            instrument: {
                displayName: `${hostname} payment`,
                icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==",
                iconMustBeShown: false,
                ...body.payment?.data?.instrument
            },
            payeeOrigin: WEBAUTHN_PAYMENT_ORIGIN || origin
        };
        const options = {
            data,
            details: body.payment.details
        };
        // console.log(options.data, options.details);
        ok<PaymentRequestOptionsJSON>(options);
        return {
            state: authentication.state,
            options
        }
    }

    async function createAuthentication() {

        const matchingType = credentials.filter(
            credential => credential.authenticatorType === authenticatorType
        );

        const allowCredentials = matchingType.map((credential): PublicKeyCredentialDescriptorFuture => ({
            id: toArrayBuffer(credential.credentialId, true),
            type: "public-key",
            transports: credential.authenticatorTransports
        }));

        const options = generateAuthenticationOptions({
            userVerification: "preferred",
            timeout,
            ...authentication,
            allowCredentials: allowCredentials.length ? allowCredentials : undefined,
        });

        const { stateKey: state } = await setAuthenticationState({
            type: "challenge",
            challenge: options.challenge,
            externalId,
            authenticatorType,
            redirectUrl,
            userState
        });

        return {
            options,
            state,
            required: !!matchingType.length
        }
    }

    async function createRegistration() {
        // console.log({ createRegistration: true, reference, existingUser })

        if (reference && !existingUser) {
            return undefined;
        }

        const excludeCredentials = credentials.map((credential): PublicKeyCredentialDescriptorFuture => ({
            id: toArrayBuffer(credential.credentialId, true),
            type: "public-key",
            transports: credential.authenticatorTransports
        }));

        const { hostname } = new URL(getOrigin());

        let registrationOptions = registration || {};

        if (authenticatorType === "payment") {
            const paymentOptions: unknown = {
                authenticatorSelection: {
                    userVerification: "required",
                    residentKey: "required",
                    authenticatorAttachment: "platform",
                },
                extensions: {
                    "payment": {
                        isPayment: true,
                    }
                }
            };
            ok<Partial<GenerateRegistrationOptionsOpts>>(paymentOptions);
            registrationOptions = {
                ...registrationOptions,
                ...paymentOptions
            }
        }

        const options = generateRegistrationOptions({
            // Don't prompt users for additional information about the authenticator
            // (Recommended for smoother UX)
            attestationType: "none",
            // Prevent users from re-registering existing authenticators
            excludeCredentials,
            timeout,
            ...registrationOptions,
            authenticatorSelection: {
                ...registrationOptions.authenticatorSelection
            },
            extensions: {
                ...registrationOptions.extensions
            },
            rpName: WEBAUTHN_RP_NAME || hostname,
            rpID: WEBAUTHN_RP_ID || hostname,
            userID: userId,
            userName: email || authenticatorType,
            userDisplayName: email || authenticatorType
        });

        const { stateKey: state } = await setAuthenticationState({
            type: "challenge",
            challenge: options.challenge,
            externalId,
            authenticatorType,
            redirectUrl,
            userState
        });

        return {
            options: {
                ...options,
                authenticatorSelection: registrationOptions.authenticatorSelection || options.authenticatorSelection,
                extensions: registrationOptions.extensions ?? options.extensions
            },
            state
        }
    }

    function createUserId() {
        const { hostname } = new URL(getOrigin());
        const hash = createHash("sha256");
        hash.update(WEBAUTHN_RP_ID || hostname);
        if (existingUser) {
            hash.update(existingUser.userId);
            hash.update(authenticatorType);
        } else {
            // Always a new id for each registration if not logged in
            hash.update(v4());
            hash.update(authenticatorType);
        }
        return hash.digest().toString("hex");
    }
}

export async function verifyWebAuthnAuthentication(body: VerifyWebAuthnAuthenticationOptionsBody, response?: FastifyReply): Promise<VerifyWebAuthnAuthenticationResponse> {
    const {
        WEBAUTHN_RP_ID,
        WEBAUTHN_RP_ORIGIN,
        WEBAUTHN_REDIRECT_URL = "/"
    } = process.env;
    const state = await getAuthenticationState(body.state);
    assertChallenge(state);
    await deleteAuthenticationState(state.stateId);

    const reference = await getExternalReference("credential", state.externalId);
    const existingUser = getMaybeUser();

    const { registration, authentication, payment } = body;

    if (registration && reference && !existingUser) {
        throw new Error("Login required before linking user");
    }
    if (reference && existingUser && reference.userId !== existingUser.userId) {
        throw new Error("Expected user to be logged in");
    }

    const expectedChallenge = state.challenge;
    const stateRedirectUrl = state.redirectUrl || await getExchangeStateURL(state.userState);
    const redirectUrl = stateRedirectUrl || WEBAUTHN_REDIRECT_URL || "/";

    if (registration) {
        ok<RegistrationResponseJSON>(body);
        const { hostname, origin } = new URL(getOrigin());

        const { verified, registrationInfo } = await verifyRegistrationResponse({
            response: registration,
            expectedChallenge,
            expectedOrigin: WEBAUTHN_RP_ORIGIN || origin,
            expectedRPID: WEBAUTHN_RP_ID || hostname
        });

        const existingUser = getMaybeUser();
        const user = await addExternalUser({
            externalType: "credential",
            externalId: state.externalId
        }, existingUser);

        let partial: Partial<VerifyWebAuthnAuthenticationResponse> = {};

        if (verified) {

            const { credentialPublicKey, credentialID, counter } = registrationInfo;
            const userCredential = await setUserCredential({
                userId: user.userId,
                credentialId: fromArrayBuffer(credentialID, true),
                credentialPublicKey: fromArrayBuffer(credentialPublicKey, true),
                credentialCounter: counter,
                authenticatorType: state.authenticatorType,
                verifiedAt: new Date().toISOString()
            });

            partial.userCredentialId = userCredential.userCredentialId;
            const userCredentialState = await addAuthenticationState({
                type: "credential",
                userCredentialId: userCredential.userCredentialId,
                userId: user.userId,
                authenticatorType: userCredential.authenticatorType,
                from: {
                    type: state.type,
                    createdAt: state.createdAt,
                    from: state.from,
                    data: state.data
                },
                data: state.data
            });
            partial.userCredentialState = userCredentialState.stateId;

            if (!existingUser && response) {
                const userRoles = await getUserAuthenticationRoleForUser(user);
                const data: UntypedAuthenticationStateData & Record<string, unknown> = {
                    userId: user.userId,
                    roles: [...new Set<AuthenticationRole>([
                        "member",
                        ...(userRoles?.roles ?? [])
                    ])],
                    from: {
                        type: "credential",
                        createdAt: userCredentialState.createdAt,
                        from: userCredentialState.from,
                        data: userCredentialState.data
                    },
                    data: userCredentialState.data,
                    userCredentialId: userCredential.userCredentialId
                }
                const cookieState = await addCookieState(data);
                setAuthenticationStateCookie(response, cookieState);
            }

        }

        return { verified, redirectUrl: verified ? redirectUrl : undefined, ...partial };
    } else if (authentication) {
        ok(reference, `Expected to find reference for user ${state.userId}`);
        const userId = reference.userId;
        const credentials = await listUserCredentials(userId);
        const existingUser = getMaybeUser();
        const existingState = getMaybeAuthenticationState();
        if (existingUser) {
            ok(existingUser.userId === userId, "Expected userId to match logged in");
        }
        const user = existingUser ?? await getUser(userId);
        const found = credentials.find(credential => credential.credentialId === authentication.id);
        ok(found, `Expected to find credential for user ${userId}`);
        const { hostname, origin } = new URL(getOrigin());
        const { verified, authenticationInfo } = await verifyAuthenticationResponse({
            response: authentication,
            expectedChallenge,
            expectedOrigin: WEBAUTHN_RP_ORIGIN || origin,
            expectedRPID: WEBAUTHN_RP_ID || hostname,
            authenticator: {
                credentialID: new Uint8Array(toArrayBuffer(found.credentialId, true)),
                credentialPublicKey: new Uint8Array(toArrayBuffer(found.credentialPublicKey, true)),
                transports: found.authenticatorTransports,
                counter: found.credentialCounter ?? 0
            }
        });
        let partial: Partial<VerifyWebAuthnAuthenticationResponse> = {};
        if (verified) {
            const { newCounter } = authenticationInfo;
            await setUserCredential({
                ...found,
                credentialCounter: newCounter
            });

            partial.userCredentialId = found.userCredentialId;
            const userCredentialState = await addAuthenticationState({
                type: "credential",
                userCredentialId: found.userCredentialId,
                userId: user.userId,
                authenticatorType: found.authenticatorType,
                from: {
                    type: state.type,
                    createdAt: state.createdAt,
                    data: state.data,
                    from: state.from
                },
                data: state.data
            });
            partial.userCredentialState = userCredentialState.stateId;

            if (!existingUser && response) {
                const userRoles = await getUserAuthenticationRoleForUser(user);

                const data: UntypedAuthenticationStateData & Record<string, unknown> = {
                    userId: user.userId,
                    roles: [...new Set<AuthenticationRole>([
                        "member",
                        ...(userRoles?.roles ?? [])
                    ])],
                    from: {
                        type: "credential",
                        createdAt: userCredentialState.createdAt,
                        data: userCredentialState.data,
                        from: userCredentialState.from,
                    },
                    data: userCredentialState.data,
                    userCredentialId: found.userCredentialId
                }
                const { stateId, expiresAt } = await addCookieState(data);

                response.setCookie("state", stateId, {
                    path: "/",
                    signed: true,
                    expires: new Date(expiresAt),
                });
            } else if (existingState) {
                await setAuthenticationState({
                    ...existingState,
                    data: {
                        ...existingState.data,
                        ...state.data
                    }
                })
            }
        }

        return { verified, redirectUrl: verified ? redirectUrl : undefined };
    } else if (payment) {
        ok(reference, `Expected to find reference for user ${state.userId}`);
        const userId = reference.userId;
        const credentials = await listUserCredentials(userId);
        const existingUser = getMaybeUser();
        if (existingUser) {
            ok(existingUser.userId === userId, "Expected userId to match logged in");
        }
        const user = existingUser ?? await getUser(userId);
        const found = credentials.find(credential => credential.credentialId === payment.details.id);
        ok(found, `Expected to find credential for user ${userId}`);
        const {hostname, origin} = new URL(getOrigin());
        const {verified, authenticationInfo} = await verifyAuthenticationResponse({
            response: payment.details,
            expectedChallenge,
            expectedOrigin: WEBAUTHN_RP_ORIGIN || origin,
            expectedRPID: WEBAUTHN_RP_ID || hostname,
            authenticator: {
                credentialID: new Uint8Array(toArrayBuffer(found.credentialId, true)),
                credentialPublicKey: new Uint8Array(toArrayBuffer(found.credentialPublicKey, true)),
                transports: found.authenticatorTransports,
                counter: found.credentialCounter ?? 0
            }
        });
        let partial: Partial<VerifyWebAuthnAuthenticationResponse> = {};

        if (verified) {
            const {newCounter} = authenticationInfo;
            await setUserCredential({
                ...found,
                credentialCounter: newCounter
            });

            partial.userCredentialId = found.userCredentialId;
            const userCredentialState = await addAuthenticationState({
                type: "credential",
                userCredentialId: found.userCredentialId,
                userId: user.userId,
                authenticatorType: found.authenticatorType,
                from: {
                    type: state.type,
                    createdAt: state.createdAt,
                    data: state.data,
                    from: state.from
                },
                data: state.data
            });
            partial.userCredentialState = userCredentialState.stateId;
        }

        return { verified, redirectUrl: verified ? redirectUrl : undefined, ...partial };
    } else {
        throw new Error("Unknown verification type")
    }

    function assertChallenge(state?: AuthenticationState): asserts state is WithChallenge {
        ok<WithChallenge>(state, INVALID_MESSAGE);
        ok(state.challenge, INVALID_MESSAGE)
    }
}