import {browserSupportsWebAuthn} from "@simplewebauthn/browser";
import {ok, isLike} from "../../utils";
import {
    authenticatePaymentMethod,
    isPaymentRequestWindow,
    isSecurePaymentConfirmationSupported
} from "../../secure-payment";
import {authenticate} from "../../webauthn";

export async function orderConfirmation(): Promise<void> {

    console.log("Hello from orderConfirmation!");


    const confirmationForm = document.getElementById("payment-method-confirmation")
    const newPaymentMethod = document.getElementById("checkout-confirmation-new-payment-method");
    try {
        if (isLike<HTMLFormElement>(confirmationForm)) {
            await withConfirmationForm(confirmationForm);
        }
    } catch (error) {
        console.error(error);
    }
    try {
        if (isLike<HTMLFormElement>(newPaymentMethod)) {
            await withNewPaymentForm(newPaymentMethod);
        }
    } catch (error) {
        console.error(error);
    }


    async function withNewPaymentForm(form: HTMLFormElement) {
        const credentialsJSON = form.querySelector(`script.payment-method-credentials[type="application/json"]`);
        ok<HTMLScriptElement>(credentialsJSON);
        const credentialOptions = JSON.parse(credentialsJSON.innerHTML);
        const paymentAuthenticator = form.querySelector("#paymentAuthenticator");

        if (credentialOptions.authentication?.required) {
            return withConfirmationForm(form);
        }

        if (!paymentAuthenticator) return;

        ok(credentialOptions.registration);

        if (!browserSupportsWebAuthn()) {
            throw new Error("Browser does not support WebAuthn")
        }

        console.log("Browser does support WebAuthn");

        if (!isPaymentRequestWindow(window)) {
            throw new Error("Browser does not support PaymentRequest")
        }
        if (!await isSecurePaymentConfirmationSupported()) {
            throw new Error("Browser does not support Secure Payment Request")
        }

        console.log("Browser does support PaymentRequest");

        const userCredentialId = form.querySelector(`input[name="userCredentialId"]`);
        const userCredentialState = form.querySelector(`input[name="userCredentialState"]`);

        console.log("Waiting for payment registration");

        form.addEventListener("submit", event => {
            ok<HTMLInputElement>(userCredentialId);
            ok<HTMLInputElement>(userCredentialState);

            if (userCredentialId.value && userCredentialState.value) {
                return; // Allow default
            }

            ok<HTMLInputElement>(paymentAuthenticator);
            if (!paymentAuthenticator.checked) {
                return; // No register, continue with default
            }
            event.preventDefault();

            // setDisabled(form, true);

            void onSubmit()
                .finally(() => {
                    // setDisabled(form, false);
                })
        })


        async function onSubmit() {
            const authenticated = await authenticate({
                authenticatorType: "payment",
                redirect: false,
                register: true,
                response: credentialOptions,
                payment: true
            });


            if (!authenticated.verified) return;

            ok<HTMLInputElement>(userCredentialId);
            ok<HTMLInputElement>(userCredentialState);

            ok(authenticated.userCredentialId);
            ok(authenticated.userCredentialState);

            userCredentialId.value = authenticated.userCredentialId;
            userCredentialState.value = authenticated.userCredentialState;

            form.submit();
        }
    }

    async function setDisabled(form: HTMLFormElement, disabled: boolean) {
        const elements = form.querySelectorAll("input:not([type=hidden]), select, textarea, button");
        for (let i = 0; i < elements.length; i += 1) {
            const element = elements.item(i);
            if (isLike<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>(element)) {
                element.disabled = disabled;
            }
        }
    }

    async function withConfirmationForm(form: HTMLFormElement) {
        const credentialsJSON = form.querySelector(`script.payment-method-credentials[type="application/json"]`);
        ok<HTMLScriptElement>(credentialsJSON);
        const credentialOptions = JSON.parse(credentialsJSON.innerHTML);

        if (credentialOptions.authentication?.required) {
            await authenticatePayment();
        } else {
            console.log("Authentication not required")
        }

        async function authenticatePayment() {
            if (!browserSupportsWebAuthn()) {
                throw new Error("Browser does not support WebAuthn")
            }

            console.log("Browser does support WebAuthn");

            if (!isPaymentRequestWindow(window)) {
                throw new Error("Browser does not support PaymentRequest")
            }
            if (!await isSecurePaymentConfirmationSupported()) {
                throw new Error("Browser does not support Secure Payment Request")
            }

            console.log("Browser does support PaymentRequest")

            const submit = form.querySelector("[type=submit]");
            ok<HTMLButtonElement | HTMLInputElement>(submit);

            const userCredentialId = form.querySelector(`input[name="userCredentialId"]`);
            const userCredentialState = form.querySelector(`input[name="userCredentialState"]`);

            const paymentMethodId = form.querySelector("#paymentMethodId");
            const paymentMethodName = form.querySelector("#paymentMethodName");
            const cardNumber = form.querySelector(`input[autocomplete="cc-number"]`);

            console.log("Waiting for submit for payment request");

            form.addEventListener("submit", event => {

                ok<HTMLInputElement>(userCredentialId);
                ok<HTMLInputElement>(userCredentialState);

                if (userCredentialId.value && userCredentialState.value) {
                    return; // Allow default
                }

                event.preventDefault();

                // setDisabled(form, true);

                void onSubmit()
                    .finally(() => {
                        // setDisabled(form, false);
                    })

            })

            async function onSubmit() {

                function getDisplayName() {
                    if (isLike<HTMLInputElement>(cardNumber) && cardNumber.value) {
                        const onlyNumbers = cardNumber.value
                            .replace(/[^\d]/g, "")
                            .split("")
                        const firstPart = onlyNumbers.slice(0, -4).map(() => "*");
                        const rest = onlyNumbers.slice(-4);
                        return [...firstPart, ...rest]
                            .join("")
                            .replaceAll(/([^\s]{4})/g, "$1 ")
                            .trim()
                    }
                    if (isLike<HTMLInputElement>(paymentMethodName) && paymentMethodName.value) {
                        return paymentMethodName.value;
                    }
                    if (isLike<HTMLSelectElement>(paymentMethodId)) {
                        return paymentMethodId.selectedOptions.item(0).textContent;
                    }
                    return "Payment";
                }

                const authenticated = await authenticate({
                    authenticatorType: "payment",
                    redirect: false,
                    response: credentialOptions,
                    payment: {
                        data: {
                            instrument: {
                                displayName: getDisplayName()
                            }
                        }
                    }
                })

                if (!authenticated.verified) return;

                ok<HTMLInputElement>(userCredentialId);
                ok<HTMLInputElement>(userCredentialState);

                ok(authenticated.userCredentialId);
                ok(authenticated.userCredentialState);

                userCredentialId.value = authenticated.userCredentialId;
                userCredentialState.value = authenticated.userCredentialState;

                // Re-submit with content
                form.submit();

            }

        }
    }


}