import {
    PublicKeyCredentialRequestOptionsJSON,
    AuthenticationResponseJSON,
    Base64URLString, PublicKeyCredentialDescriptorJSON, PublicKeyCredentialJSON
} from "@simplewebauthn/typescript-types";
import {
    AuthenticationExtensionsClientInputs,
    UserVerificationRequirement
} from "@simplewebauthn/typescript-types/dist/dom";

export interface PaymentRequestInstrument {
    displayName: string;
    icon: string;
    iconMustBeShown?: boolean;
}

export interface PaymentRequestDataJSON {
    challenge: Base64URLString;
    timeout?: number;
    rpId?: string;
    allowCredentials?: PublicKeyCredentialDescriptorJSON[];
    instrument: PaymentRequestInstrument;
    payeeOrigin: string;
}

export interface PartialPaymentRequestDataJSON extends Partial<Omit<PaymentRequestDataJSON, "instrument">> {
    instrument?: Partial<PaymentRequestInstrument>;
}

export interface PaymentRequestOptionsJSON {
    data: PaymentRequestDataJSON;
    details: PaymentDetailsInit;
}

export interface PartialPaymentRequestOptionsJSON {
    data?: PartialPaymentRequestDataJSON;
    details?: Partial<PaymentDetailsInit>;
}

export interface PaymentResponseJSON {
    details: AuthenticationResponseJSON
    methodName: string;
    payerEmail?: string;
    payerName?: string;
    payerPhone?: string;
    requestId: string;
    shippingAddress?: unknown;
    shippingOption?: unknown;
}

/*
{
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
 */