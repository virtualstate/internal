import {GenerateRegistrationOptionsOpts} from "@simplewebauthn/server/dist/registration/generateRegistrationOptions";
import {GenerateAuthenticationOptionsOpts} from "@simplewebauthn/server";
import {
    AuthenticationResponseJSON,
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
    RegistrationResponseJSON
} from "@simplewebauthn/typescript-types";
import {startAuthentication, startRegistration} from "@simplewebauthn/browser";
import type {PaymentRequestOptionsJSON, PaymentResponseJSON} from "../../listen/auth/types";
import {startPaymentRequest} from "./secure-payment";
import {PartialPaymentRequestOptionsJSON} from "../../listen/auth/types";


export interface AuthenticateOptions extends WebAuthnOptionsOptions {
    payment?: boolean | PartialPaymentRequestOptionsJSON;
    response?: WebAuthnOptionsResponse;
    redirect?: boolean;
}

export async function authenticate(options: AuthenticateOptions): Promise<VerifyResponse> {

    if (options.payment) {
        if (!options.authenticatorType) {
            options = {
                ...options,
                authenticatorType: "payment"
            }
        }
    }

    if (!options.authenticatorType) {
        options = {
            ...options,
            authenticatorType: "credential"
        }
    }


    const { registration, authentication, payment } = options.response ?? await generateOptions(options);

    console.log(options, { registration, authentication, payment });
    let response;
    if (options.register || (!authentication && !payment)) {
        if (!registration) {
            const message = "Can only register new credentials on original device";
            alert(message);
            throw new Error(message);
        }
        response = await verify({
            registration: await startRegistration(registration.options),
            state: registration.state
        });
    } else if (payment) {
        const paymentPartialOptions: PartialPaymentRequestOptionsJSON = typeof options.payment !== "boolean" ? options.payment : {

        }
        const paymentOptions: PaymentRequestOptionsJSON = {
            ...payment.options,
            ...paymentPartialOptions,
            data: {
                ...payment.options.data,
                ...paymentPartialOptions?.data,
                instrument: {
                    ...payment.options.data.instrument,
                    ...paymentPartialOptions?.data?.instrument
                },
            },
            details: {
                ...payment.options.details,
                ...paymentPartialOptions.details,
                total: {
                    ...payment.options.details.total,
                    ...paymentPartialOptions.details?.total
                }
            }
        }
        response = await verify({
            payment: await startPaymentRequest(paymentOptions),
            state: authentication.state
        });
    } else {
        response = await verify({
            authentication: await startAuthentication(authentication.options),
            state: authentication.state
        });
    }

    if (options.redirect !== false) {

        if (response?.verified && response?.redirectUrl) {
            location.href = response.redirectUrl;
        }
    }

    return response;
}

export interface WebAuthnOptionsOptions {
    email?: string
    register?: boolean;
    authenticatorType?: string;
    registration?: Record<string, unknown>
    authentication?: Record<string, unknown>
}

export interface WebAuthnOptionsResponse {
    registration: {
        state: string;
        options: PublicKeyCredentialCreationOptionsJSON
    },
    authentication?: {
        state: string;
        options: PublicKeyCredentialRequestOptionsJSON;
    },
    payment?: {
        state: string;
        options: PaymentRequestOptionsJSON;
    }
}

async function generateOptions(options: WebAuthnOptionsOptions): Promise<WebAuthnOptionsResponse> {
    const response = await fetch("/api/authentication/webauthn/generate-options", {
        method: "POST",
        body: JSON.stringify(options),
        headers: {
            "Content-Type": "application/json"
        }
    });
    return response.json();
}

interface VerifyOptions {
    registration?: RegistrationResponseJSON;
    authentication?: AuthenticationResponseJSON;
    payment?: PaymentResponseJSON;
    state: string;
}

interface VerifyResponse {
    verified: boolean;
    userCredentialId?: string;
    userCredentialState?: string;
    redirectUrl?: string;
}

async function verify(options: VerifyOptions): Promise<VerifyResponse> {
    const response = await fetch("/api/authentication/webauthn/verify", {
        method: "POST",
        body: JSON.stringify(options),
        headers: {
            "Content-Type": "application/json"
        }
    });
    return response.json();
}
