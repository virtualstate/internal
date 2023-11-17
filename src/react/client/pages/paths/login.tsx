import {ok} from "../../utils";
import {browserSupportsWebAuthn} from "@simplewebauthn/browser";
import {authsignalPasskey, isAuthsignalMeta} from "../../authsignal";
import {authenticate} from "../../webauthn";

export async function login() {

    console.log("Hello from login!");

    if (!browserSupportsWebAuthn()) {
        console.log("Browser does not support WebAuthn")
        return;
    }
    console.log("Browser does support WebAuthn");

    const form = document.getElementById("login-authsignal");
    ok<HTMLFormElement>(form);

    const isNative = !isAuthsignalMeta(form);

    const input = form.querySelector("input[name=email]");

    const submit = form.querySelector("button[type=submit]");
    ok<HTMLButtonElement>(submit);

    submit.textContent = "Continue with Passkey";

    const register = submit.cloneNode(true);
    ok<HTMLButtonElement>(register);
    register.textContent = "Register new Passkey";
    register.type = "button";
    submit.parentElement.appendChild(register);

    register.addEventListener("click", event => {
        event.preventDefault();

        onSubmit(true);
    })

    form.addEventListener("submit", event => {
        event.preventDefault();

        onSubmit();
    })

    function onSubmit(isRegister?: boolean) {
        ok<HTMLInputElement>(input);
        ok<HTMLButtonElement>(submit);
        ok<HTMLButtonElement>(register);

        if (!input.value?.trim()) {
            return;
        }

        input.disabled = true;
        submit.disabled = true;
        register.disabled = true;

        void onSubmitAsync(isRegister)
            .finally(() => {
                input.disabled = false;
                submit.disabled = false;
                register.disabled = false;
            });
    }

    async function onSubmitAsync(isRegister?: boolean) {
        ok<HTMLFormElement>(form);
        ok<HTMLInputElement>(input);

        const email = input.value;

        if (isNative) {
            await authenticate({ email, register: isRegister });
        } else {
            await authsignalPasskey({ email, register: isRegister });
        }
    }
}