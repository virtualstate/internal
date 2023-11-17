import { FastifyRequest } from "fastify";
import {
    useError,
    useMaybeBody,
    useMaybeResult,
    useProduct,
    useQuery,
    useQuerySearch, useService,
    useSubmitted,
    useTimezone
} from "../../data";
import {
    Offer,
    OfferData,
    addOffer
} from "../../../../data";
import {ok} from "../../../../is";

export const path = "/offer/create";

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

function assertOfferData(value: unknown): asserts value is OfferData {
    ok<OfferData>(value);
    ok(value.currency, "Expected currency");
}

export async function submit(request: FastifyRequest) {
    const data = request.body;
    assertOfferData(data);
    const offer = await addOffer(data);
    console.log({ offer });
    return { success: true, offer };
}

const LINK_CLASS = "text-blue-600 hover:bg-white underline hover:underline-offset-2";

export function CreateOffer() {
    const query = useQuery<{ productId?: string, serviceId?: string }>();
    const body = useMaybeBody<OfferData>();
    const firstItem = body?.items[0];
    const productId = query.productId ?? (firstItem?.type === "product" ? firstItem.productId : undefined);
    const serviceId = query.serviceId ?? (firstItem?.type === "service" ? firstItem.serviceId : undefined);
    const queryProduct = useProduct(productId);
    const queryService = useService(serviceId);
    const timezone = useTimezone();
    const submitted = useSubmitted();
    const result = useMaybeResult<{ success: boolean; offer: Offer }>();
    const error = useError();

    console.error(error);

    return <OfferBody body={result?.success ? undefined : body} />

    function OfferBody({ body }: { body?: OfferData }) {
        return (
            <form name="offer" action="/offer/create#action-section" method="post">
                {
                    queryProduct ? (
                        <>
                            <input type="hidden" name="items[0].type" value="product" />
                            <input type="hidden" name="items[0].productId" value={queryProduct.productId} />
                            <div className="flex flex-col">
                                <label className={FORM_GROUP_CLASS}>
                                    <span className="text-gray-700">Product Name</span>
                                    <input
                                        className={FORM_CLASS}
                                        disabled
                                        type="text"
                                        placeholder="Product Name"
                                        defaultValue={queryProduct.productName || ""}
                                    />
                                </label>
                            </div>
                            <div className="flex flex-col">
                                <label className={FORM_GROUP_CLASS}>
                                    <span className="text-gray-700">Product Quantity</span>
                                    <input
                                        className={FORM_CLASS}
                                        type="text"
                                        placeholder="Product Quantity"
                                        name="items[0].quantity"
                                        defaultValue={(body?.items[0]?.quantity ?? "1").toString()}
                                    />
                                </label>
                            </div>
                        </>
                    ) : undefined
                }
                {
                    queryService ? (
                        <>
                            <input type="hidden" name="items[0].type" value="service" />
                            <input type="hidden" name="items[0].serviceId" value={queryService.serviceId} />
                            <div className="flex flex-col">
                                <label className={FORM_GROUP_CLASS}>
                                    <span className="text-gray-700">Service Name</span>
                                    <input
                                        className={FORM_CLASS}
                                        disabled
                                        type="text"
                                        placeholder="Service Name"
                                        defaultValue={queryService.serviceName || ""}
                                    />
                                </label>
                            </div>
                            <div className="flex flex-col">
                                <label className={FORM_GROUP_CLASS}>
                                    <span className="text-gray-700">Service Quantity</span>
                                    <input
                                        className={FORM_CLASS}
                                        type="text"
                                        placeholder="Service Quantity"
                                        name="items[0].quantity"
                                        defaultValue={(body?.items[0]?.quantity ?? "1").toString()}
                                    />
                                </label>
                            </div>
                        </>
                    ) : undefined
                }
                <div className="flex flex-col">
                    <label className={FORM_GROUP_CLASS}>
                        <span className="text-gray-700">Offer Name</span>
                        <input
                            className={FORM_CLASS}
                            type="text"
                            name="offerName"
                            placeholder="Offer Name"
                            defaultValue={body?.offerName || ""}
                        />
                    </label>
                </div>
                <div className="flex flex-col">
                    <label className={FORM_GROUP_CLASS}>
                        <span className="text-gray-700">Price</span>
                        <input
                            className={FORM_CLASS}
                            type="text"
                            name="price"
                            placeholder="Price"
                            defaultValue={body?.price || ""}
                        />
                    </label>
                </div>
                <div className="flex flex-col">
                    <label className={FORM_GROUP_CLASS}>
                        <span className="text-gray-700">Currency</span>
                        <select
                            className={FORM_CLASS}
                            name="currency"
                            defaultValue={body?.currency || "NZD"}
                        >
                            <option value="NZD">New Zealand Dollar</option>
                        </select>
                    </label>
                </div>
                <label htmlFor="public" className="my-4 flex flex-row align-start">
                    <input
                        name="public"
                        id="public"
                        type="checkbox"
                        className="form-checkbox rounded m-1"
                        defaultChecked={false}
                    />
                    <span className="flex flex-col ml-4">
                        Should the offer be visible to the public?
                    </span>
                </label>
                <style dangerouslySetInnerHTML={{ __html: `
                .non-generic-organisation-name {
                    display: none;
                }
                
                label:has(input:checked) + .non-generic-organisation-name {
                    display: flex;
                }
                
                `.trim()}} />
                <div id="action-section">
                    <button
                        type="submit"
                        className="bg-sky-500 hover:bg-sky-700 px-4 py-2.5 text-sm leading-5 rounded-md font-semibold text-white"
                    >
                        Save Offer
                    </button>
                </div>
            </form>
        )
    }
}

export const Component = CreateOffer;