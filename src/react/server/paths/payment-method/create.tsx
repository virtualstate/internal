import { FastifyRequest } from "fastify";
import {useError, useInput, useMaybeBody, useMaybeResult, useSubmitted, useTimezone} from "../../data";
import {
    PaymentMethod,
    PaymentMethodData,
    addPaymentMethod
} from "../../../../data";
import {ok} from "../../../../is";
import {getMaybePartner, getMaybeUser} from "../../../../authentication";
import {getWebAuthnAuthenticationOptions, WebAuthnAuthenticationResponse} from "../../../../listen/auth/webauthn";

export const path = "/payment-method/create";

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

function assertPaymentMethodData(value: unknown): asserts value is PaymentMethodData {
    ok<PaymentMethodData>(value);
    ok(value.type, "Expected type");
    ok(value.status, "Expected status");
}

export async function submit(request: FastifyRequest) {
    const data = request.body;
    assertPaymentMethodData(data);
    const paymentMethod = await addPaymentMethod({
        ...data,
        userId: getMaybeUser()?.userId,
        organisationId: getMaybePartner()?.organisationId
    });
    console.log({ paymentMethod });
    return { success: true, paymentMethod };
}

export function CreatePaymentMethod() {
    const body = useMaybeBody<PaymentMethodData>();
    const timezone = useTimezone();
    const submitted = useSubmitted();
    const result = useMaybeResult<{ success: boolean; paymentMethod: PaymentMethod }>();
    const error = useError();

    console.error(error);

    return <PaymentMethodBody body={result?.success ? undefined : body} />

    function PaymentMethodBody({ body }: { body?: PaymentMethodData }) {
        return (
            <form name="paymentMethodCreate" id="paymentMethodCreate" action={`${path}#action-section`} method="post">
                <div className="flex flex-col">
                    <label className={FORM_GROUP_CLASS}>
                        <span className="text-gray-700">Payment Method Name</span>
                        <input
                            className={FORM_CLASS}
                            type="text"
                            name="paymentMethodName"
                            placeholder="Payment Method Name"
                            defaultValue={body?.paymentMethodName || ""}
                        />
                    </label>
                </div>
                <div className="flex flex-col">
                    <label className={FORM_GROUP_CLASS}>
                        <span className="text-gray-700">Status</span>
                        <select
                            className={FORM_CLASS}
                            name="status"
                            defaultValue={body?.status || "available"}
                        >
                            <option value="pending">Pending</option>
                            <option value="available">Available</option>
                            <option value="expired">Expired</option>
                            <option value="void">Void</option>
                        </select>
                    </label>
                </div>
                <div className="flex flex-col">
                    <label className={FORM_GROUP_CLASS}>
                        <span className="text-gray-700">Type</span>
                        <select
                            className={FORM_CLASS}
                            name="type"
                            defaultValue={body?.type || "realtime"}
                        >
                            <option value="realtime">Realtime</option>
                            <option value="invoice">Invoice</option>
                        </select>
                    </label>
                </div>
                <div id="action-section">
                    <button
                        type="submit"
                        className="bg-sky-500 hover:bg-sky-700 px-4 py-2.5 text-sm leading-5 rounded-md font-semibold text-white"
                    >
                        Save Payment Method
                    </button>
                </div>
            </form>
        )
    }
}

export const Component = CreatePaymentMethod;