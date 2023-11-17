import { FastifyRequest } from "fastify";
import {useError, useMaybeBody, useMaybeResult, useSubmitted, useTimezone} from "../../data";
import {
    Product,
    ProductData,
    addProduct
} from "../../../../data";
import {ok} from "../../../../is";

export const path = "/product/create";

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

function assertProductData(value: unknown): asserts value is ProductData {
    ok<ProductData>(value);
    ok(value.productName, "Expected productName");
}

export async function submit(request: FastifyRequest) {
    const data = request.body;
    assertProductData(data);
    const product = await addProduct(data);
    console.log({ product });
    return { success: true, product };
}

export function CreateProduct() {
    const body = useMaybeBody<ProductData>();
    const timezone = useTimezone();
    const submitted = useSubmitted();
    const result = useMaybeResult<{ success: boolean; product: Product }>();
    const error = useError();

    console.error(error);

    return <ProductBody body={result?.success ? undefined : body} />

    function ProductBody({ body }: { body?: ProductData }) {
        return (
            <form name="product" action="/product/create#action-section" method="post">
                <div className="flex flex-col">
                    <label className={FORM_GROUP_CLASS}>
                        <span className="text-gray-700">Product Name</span>
                        <input
                            className={FORM_CLASS}
                            type="text"
                            name="productName"
                            placeholder="Product Name"
                            defaultValue={body?.productName || ""}
                        />
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
                        Should the product be visible to the public?
                    </span>
                </label>
                <style dangerouslySetInnerHTML={{ __html: `
                .non-generic-organisation-name {
                    display: none;
                }
                
                label:has(input:not(:checked)) + .non-generic-organisation-name {
                    display: flex;
                }
                
                `.trim()}} />
                <label htmlFor="generic" className="my-4 flex flex-row align-start">
                    <input
                        name="generic"
                        id="generic"
                        type="checkbox"
                        className="form-checkbox rounded m-1"
                        defaultChecked={false}
                    />
                    <span className="flex flex-col ml-4">
                        Is the product generic? (Not related to a brand)
                    </span>
                </label>
                <div className="flex flex-col non-generic-organisation-name">
                    <label className={FORM_GROUP_CLASS}>
                        <span className="text-gray-700">Brand Name</span>
                        <input
                            className={FORM_CLASS}
                            type="text"
                            name="organisationText"
                            placeholder="Brand Name"
                            defaultValue={body?.organisationText || ""}
                        />
                    </label>
                </div>
                <div id="action-section">
                    <button
                        type="submit"
                        className="bg-sky-500 hover:bg-sky-700 px-4 py-2.5 text-sm leading-5 rounded-md font-semibold text-white"
                    >
                        Save Product
                    </button>
                </div>
            </form>
        )
    }
}

export const Component = CreateProduct;