import {PaymentRequestOptionsJSON, PaymentResponseJSON} from "../../listen/auth/types";
import base64 from "@hexagon/base64";
import toArrayBuffer = base64.toArrayBuffer;
import {isLike, ok} from "./utils";
import fromArrayBuffer = base64.fromArrayBuffer;
import {
    AuthenticationResponseJSON,
    AuthenticatorAssertionResponseJSON, Base64URLString,
    PublicKeyCredentialJSON
} from "@simplewebauthn/typescript-types";
interface PaymentRequestOptions {

}

interface NewPaymentRequest {
    new (): PaymentRequest
}

export interface PaymentCredentialResponse extends PaymentResponse {
    complete(): Promise<void>
    retry(): Promise<void>
    details: PublicKeyCredential & { response: AuthenticatorAssertionResponse }
    methodName: string;
    payerEmail?: string;
    payerName?: string;
    payerPhone?: string;
    requestId: string;
    shippingAddress?: unknown;
    shippingOption?: unknown;
    toJSON(): unknown;
}

interface PaymentCredentialRequest {
    show(): Promise<PaymentCredentialResponse>;
    canMakePayment(): Promise<boolean>;
}

export function isPaymentRequestWindow(window: Window): boolean {
    return "PaymentRequest" in window
}

export async function isSecurePaymentConfirmationSupported() {
    if (!isPaymentRequestWindow(window)) {
        return [false, 'Payment Request API is not supported'];
    }

    try {
        // The data below is the minimum required to create the request and
        // check if a payment can be made.
        const supportedInstruments = [
            {
                supportedMethods: "secure-payment-confirmation",
                data: {
                    // RP's hostname as its ID
                    rpId: 'rp.example',
                    // A dummy credential ID
                    credentialIds: [new Uint8Array(1)],
                    // A dummy challenge
                    challenge: new Uint8Array(1),
                    instrument: {
                        // Non-empty display name string
                        displayName: ' ',
                        // Transparent-black pixel.
                        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==',
                    },
                    // A dummy merchant origin
                    payeeOrigin: 'https://non-existent.example',
                }
            }
        ];

        const details = {
            // Dummy shopping details
            total: {label: 'Total', amount: {currency: 'USD', value: '0'}},
        };

        const request = new PaymentRequest(supportedInstruments, details);
        const canMakePayment = await request.canMakePayment();
        return [canMakePayment, canMakePayment ? '' : 'SPC is not available'];
    } catch (error) {
        console.error(error);
        return [false, error.message];
    }
}

export interface PaymentMethodInfo {
    paymentMethodId: string;
    paymentMethodName: string;
    challenge: string;
    credentialIds: string[];
    payeeOrigin?: string;
}

export async function authenticatePaymentMethod({ credentialIds, challenge, paymentMethodName, payeeOrigin }: PaymentMethodInfo) {
    console.log(`${location.hostname}`)
    const request = new PaymentRequest([{
        // Specify `secure-payment-confirmation` as payment method.
        supportedMethods: "secure-payment-confirmation",
        data: {
            // The RP ID
            rpId: location.hostname,

            // List of credential IDs obtained from the RP server.
            credentialIds: credentialIds.flatMap(value => value.split("_")).map(base64ToArrayBuffer),

            // The challenge is also obtained from the RP server.
            challenge: base64ToArrayBuffer(challenge),

            // A display name and an icon that represent the payment instrument.
            instrument: {
                displayName: paymentMethodName,
                // Transparent-black pixel.
                icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==",
                iconMustBeShown: false
            },

            // The origin of the payee (merchant)
            payeeOrigin: payeeOrigin || location.origin,

            // The number of milliseconds to timeout.
            timeout: 360000,  // 6 minutes
        }
    }], {
        // Payment details.
        total: {
            label: "Total",
            amount: {
                currency: "USD",
                value: "5.00",
            },
        },
    });

    try {
        ok<PaymentCredentialRequest>(request);
        const response = await request.show();
        ok<PaymentCredentialResponse>(response);

        console.log(response.details);
        //
        // // response.details is a PublicKeyCredential, with a clientDataJSON that
        // // contains the transaction data for verification by the issuing bank.
        // // Make sure to serialize the binary part of the credential before
        // // transferring to the server.
        // const result = fetchFromServer('https://rp.example/spc-auth-response', response.details);
        // if (result.success) {
        //     await response.complete('success');
        // } else {
        //     await response.complete('fail');
        // }

    } catch (err) {
        // SPC cannot be used; merchant should fallback to traditional flows
        console.error(err);
    }
}

function base64ToArrayBuffer(base64: string) {
    // if (base64.includes("_")) {
    //     const [, b, next] = base64.split("_");
    //     if (next) {
    //         throw new Error("Expected triple part key");
    //     }
    //     return base64ToArrayBuffer(b);
    // }
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

export async function startPaymentRequest(options: PaymentRequestOptionsJSON): Promise<PaymentResponseJSON> {
    let { data: { allowCredentials, challenge, ...rest }, details } = options;

    ok(allowCredentials.length, "Expected credentials");

    const data = {
        ...rest,
        credentialIds: allowCredentials.map(
            credential => base64URLStringToBuffer(credential.id)
        ),
        challenge: base64URLStringToBuffer(challenge)
    }

    console.log(data);

    const request = new PaymentRequest([{
        // Specify `secure-payment-confirmation` as payment method.
        supportedMethods: "secure-payment-confirmation",
        data
    }], details);

    ok<PaymentCredentialRequest>(request);
    const response = await request.show();
    ok<PaymentCredentialResponse>(response);

    console.log(response);

    const assertionResponse: AuthenticatorAssertionResponse = response.details.response;
    const assertionResponseJSON: AuthenticatorAssertionResponseJSON = {
        authenticatorData: toBase64URLString(assertionResponse.authenticatorData),
        clientDataJSON: toBase64URLString(assertionResponse.clientDataJSON),
        signature: toBase64URLString(assertionResponse.signature),
        userHandle: toBase64URLString(assertionResponse.userHandle)
    }
    const clientExtensionResults: AuthenticationExtensionsClientOutputs = {};
    /*
    id: Base64URLString;
    rawId: Base64URLString;
    response: AuthenticatorAssertionResponseJSON;
    authenticatorAttachment?: AuthenticatorAttachment;
    clientExtensionResults: AuthenticationExtensionsClientOutputs;
    type: PublicKeyCredentialType;
     */
    const authenticatorAttachmentInput = response.details.authenticatorAttachment;
    const authenticatorAttachment: AuthenticatorAttachment | undefined = isLike<AuthenticatorAttachment>(authenticatorAttachmentInput) ? authenticatorAttachmentInput : undefined;
    const type = response.details.type;
    ok<PublicKeyCredentialType>(type);

    const detailsJSON: AuthenticationResponseJSON = {
        clientExtensionResults,
        authenticatorAttachment,
        id: response.details.id,
        rawId: toBase64URLString(response.details.rawId),
        response: assertionResponseJSON,
        type
    };

    function toBase64URLString(input: ArrayBuffer) {
        const string = fromArrayBuffer(input, true);
        ok<Base64URLString>(string);
        return string;
    }

    const json: PaymentResponseJSON = {
        details: detailsJSON,
        methodName: response.methodName,
        payerEmail: response.payerName,
        payerName: response.payerName,
        payerPhone: response.payerPhone,
        requestId: response.requestId,
        shippingAddress: response.shippingAddress,
        shippingOption: response.shippingOption,
    }

    console.log(json);

    await response.complete();

    return json;
}



// From https://github.com/MasterKale/SimpleWebAuthn/blob/master/packages/browser/src/helpers/base64URLStringToBuffer.ts#L8
/**
 * Convert from a Base64URL-encoded string to an Array Buffer. Best used when converting a
 * credential ID from a JSON string to an ArrayBuffer, like in allowCredentials or
 * excludeCredentials
 *
 * Helper method to compliment `bufferToBase64URLString`
 */
function base64URLStringToBuffer(base64URLString: string): ArrayBuffer {
    // Convert from Base64URL to Base64
    const base64 = base64URLString.replace(/-/g, '+').replace(/_/g, '/');
    /**
     * Pad with '=' until it's a multiple of four
     * (4 - (85 % 4 = 1) = 3) % 4 = 3 padding
     * (4 - (86 % 4 = 2) = 2) % 4 = 2 padding
     * (4 - (87 % 4 = 3) = 1) % 4 = 1 padding
     * (4 - (88 % 4 = 0) = 4) % 4 = 0 padding
     */
    const padLength = (4 - (base64.length % 4)) % 4;
    const padded = base64.padEnd(base64.length + padLength, '=');

    // Convert to a binary string
    const binary = atob(padded);

    // Convert binary string to buffer
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return buffer;
}