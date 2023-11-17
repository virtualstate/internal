import {browserSupportsWebAuthn} from "@simplewebauthn/browser";
import {ok} from "../../utils";
import {
    authenticatePaymentMethod,
    isPaymentRequestWindow,
    isSecurePaymentConfirmationSupported
} from "../../secure-payment";

export async function paymentMethodSelect(): Promise<void> {

    console.log("Hello from paymentMethodSelect!");

    if (!browserSupportsWebAuthn()) {
        console.log("Browser does not support WebAuthn")
        return;
    }

    console.log("Browser does support WebAuthn");

    if (!isPaymentRequestWindow(window)) {
        console.log("Browser does not support PaymentRequest")
        return;
    }
    if (!await isSecurePaymentConfirmationSupported()) {
        console.log("Browser does not support Secure Payment Request")
        return;
    }

    console.log("Browser does support PaymentRequest")

    const form = document.getElementById("paymentMethodSelect")
    ok<HTMLFormElement>(form);

    const credentialIdsMeta = form.querySelector("meta[name=credentialIds]");
    const challengeMeta = form.querySelector("meta[name=challenge]");
    const payeeOriginMeta = form.querySelector("meta[name=payeeOrigin]");
    ok<HTMLMetaElement>(credentialIdsMeta);
    ok<HTMLMetaElement>(challengeMeta);
    ok<HTMLMetaElement>(payeeOriginMeta);

    const submit = form.querySelector("button[type=submit]");
    ok<HTMLButtonElement>(submit);

    const select = form.querySelector("select[name=paymentMethodId]");
    ok<HTMLSelectElement>(select);

    const credentialIds = credentialIdsMeta.content.split(",");
    const challenge = challengeMeta.content;
    const payeeOrigin = payeeOriginMeta.content;

    form.addEventListener("submit", event => {
        event.preventDefault();

        submit.disabled = true;
        select.disabled = true;

        void onSubmit()
            .finally(() => {
                submit.disabled = false;
                select.disabled = false;
            })

    })

    async function onSubmit() {
        ok<HTMLSelectElement>(select);

        const selectedOption = select.selectedOptions.item(0);
        if (!selectedOption) return;
        const paymentMethodId = selectedOption.value;
        const paymentMethodName = selectedOption.textContent;

        await authenticatePaymentMethod({
            paymentMethodName,
            paymentMethodId,
            challenge,
            credentialIds,
            payeeOrigin
        })


    }

}