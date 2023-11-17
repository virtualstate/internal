import { FastifyRequest } from "fastify";
import {
    ReactData,
    useData,
    useError, useInput,
    useMaybeBody,
    useMaybeResult,
    usePaymentMethods,
    useSubmitted,
    useTimezone
} from "../../data";
import {
    PaymentMethod,
    PaymentMethodData,
    addPaymentMethod, listPaymentMethods, getPaymentMethod, addAuthenticationState
} from "../../../../data";
import {isNumberString, ok} from "../../../../is";
import {getMaybePartner, getMaybeUser} from "../../../../authentication";
import {getUserIdentifiers} from "./utils";
import {listUserCredentials} from "../../../../data/user-credential";
import {v4} from "uuid";
import {hash} from "bcrypt";
import {getRandomValues} from "crypto";


// https://github.com/MasterKale/SimpleWebAuthn/blob/master/packages/server/src/helpers/generateChallenge.ts
function generateChallenge(): string {
    const challenge = new Uint8Array(32);
    getRandomValues(challenge);
    return Buffer.from(challenge).toString("base64");
}

export const path = "/payment-method/select";

export const MINUTE_MS = 60 * 1000;
export const DAY_MS = 24 * 60 * MINUTE_MS;

const FORM_CLASS = `
mt-1
block
w-full
md:max-w-sm
rounded-md
border-gray-300
shadow-sm
focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50
disabled:bg-slate-300 disabled:cursor-not-allowed
`.trim();
const FORM_GROUP_CLASS = `block py-2`;

interface SelectPaymentMethod {
    redirectUrl: string;
    paymentMethodId: string;
}

function assertSelectPaymentMethod(value: unknown): asserts value is SelectPaymentMethod {
    ok<SelectPaymentMethod>(value);
    ok(value.redirectUrl, "Expected redirectUrl");
    ok(value.paymentMethodId, "Expected paymentMethodId");
}

interface Input extends Partial<ReactData> {
    credentialIds: string[];
    challenge?: string;
    state?: string;
}

const {
    PAYMENT_METHOD_BCRYPT_SALT,
    PAYMENT_METHOD_BCRYPT_ROUNDS,
    PAYMENT_METHOD_ORIGIN,
} = process.env;

const DEFAULT_PAYMENT_ORIGIN = "https://payments.virtualstate.dev"

const DEFAULT_ROUNDS = 13;

function getSaltOrRounds() {
    if (isNumberString(PAYMENT_METHOD_BCRYPT_ROUNDS)) {
        return +PAYMENT_METHOD_BCRYPT_ROUNDS;
    } else if (PAYMENT_METHOD_BCRYPT_SALT) {
        return PAYMENT_METHOD_BCRYPT_SALT;
    }
    return DEFAULT_ROUNDS;
}

export async function handler(): Promise<Input> {
    const identifiers = getUserIdentifiers();
    const credentialIds: string[] = [];
    let challenge,
        state
    if (identifiers.userId) {
        const credentials = await listUserCredentials(identifiers.userId);
        credentialIds.push(
            ...credentials.map(credential => credential.credentialId)
        );
        challenge = generateChallenge();
        const { stateKey } = await addAuthenticationState({
            type: "challenge",
            ...identifiers,
            challengeHash: await hash(challenge, getSaltOrRounds())
        });
        state = stateKey;
    }
    return {
        challenge,
        state,
        credentialIds,
        paymentMethods: await listPaymentMethods(getUserIdentifiers())
    }
}

export async function submit(request: FastifyRequest) {
    const data = request.body;
    assertSelectPaymentMethod(data);
    const paymentMethod = await getPaymentMethod({
        paymentMethodId: data.paymentMethodId,
        ...getUserIdentifiers()
    });
    console.log({ paymentMethod });
    return { success: true, paymentMethod };
}

export function SelectPaymentMethod() {
    const paymentMethods = usePaymentMethods();
    const body = useMaybeBody<SelectPaymentMethod>();
    const timezone = useTimezone();
    const submitted = useSubmitted();
    const { credentialIds, challenge, state } = useInput<Input>();
    const result = useMaybeResult<{ success: boolean; paymentMethod: PaymentMethod }>();
    const error = useError();
    const { url } = useData();
    const { searchParams, pathname } = new URL(url);
    console.error(error);

    return <PaymentMethodBody body={result?.success ? undefined : body} />

    function PaymentMethodBody({ body }: { body?: SelectPaymentMethod }) {
        return (
            <form name="paymentMethodSelect" id="paymentMethodSelect" action={`${pathname}#action-section`} method="post">
                <meta name="credentialIds" content={credentialIds.join(",")} />
                <meta name="challenge" content={challenge} />
                <meta name="state" content={state} />
                <meta name="payeeOrigin" content={PAYMENT_METHOD_ORIGIN || DEFAULT_PAYMENT_ORIGIN} />
                <input type="hidden" name="redirectUrl" value={body?.redirectUrl ?? searchParams.get("redirectUrl") ?? ""} />
                <div className="flex flex-col">
                    <label className={FORM_GROUP_CLASS}>
                        <span className="text-gray-700">Payment Method</span>
                        <select
                            className={FORM_CLASS}
                            name="paymentMethodId"
                            defaultValue={body?.paymentMethodId ?? paymentMethods[0]?.paymentMethodId}
                        >
                            {paymentMethods.map(
                                (paymentMethod, index) => (
                                    <option
                                        value={paymentMethod.paymentMethodId}
                                        key={index}
                                    >
                                        {paymentMethod.paymentMethodName || paymentMethod.paymentMethodId}
                                    </option>
                                )
                            )}
                        </select>
                    </label>
                </div>
                <div id="action-section">
                    <button
                        type="submit"
                        className="bg-sky-500 hover:bg-sky-700 px-4 py-2.5 text-sm leading-5 rounded-md font-semibold text-white"
                    >
                        Use Payment Method
                    </button>
                </div>
            </form>
        )
    }
}

export const Component = SelectPaymentMethod;