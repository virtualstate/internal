import {
    Offer,
    OfferData,
    Partner,
    PartnerData, Product, ProductData,
    SystemLog,
} from "./interface.readonly";
import {
    Client as ClientInterface,
    ClientOptions
} from "./client.interface"
import {ok} from "../is";

export * from "./client.interface";

export class Client implements ClientInterface {

    readonly baseUrl: string | URL;
    readonly headers: Headers;
    readonly partnerId: string | undefined;
    readonly version: number;
    readonly prefix: string;

    constructor({ url, accessToken, partnerId, version, prefix }: ClientOptions = {}) {
        this.baseUrl = url ?? "https://discord.patient.nz";
        version = version ?? 1;
        this.version = version;
        this.partnerId = partnerId;
        this.prefix = prefix ?? `/api/version/${version}`;
        const headers = this.headers = new Headers();
        headers.set("Content-Type", "application/json");
        headers.set("Accept", "application/json");
        if (accessToken) {
            headers.set("Authorization", `Bearer ${accessToken}`);
        }
        if (partnerId) {
            headers.set("X-Partner-ID", partnerId);
        }

        return this;
    }

    async addPartner(partner: PartnerData): Promise<Partner> {
        const response = await this.fetch(
            `${this.prefix}/partners`,
            {
                method: "POST",
                body: JSON.stringify(partner)
            }
        );
        ok(response.ok, "addPartner response not ok");
        return await response.json();
    }

    async listPartners(): Promise<Partner[]> {
        const response = await this.fetch(
            `${this.prefix}/partners`
        );
        ok(response.ok, "listPartners response not ok");
        return response.json();
    }

    async listSystemLogs(): Promise<SystemLog[]> {
        const {
            baseUrl,
            headers,
            prefix,
            partnerId
        } = this;
        const url = new URL(
            `${prefix}/system-logs`,
            baseUrl
        );
        if (partnerId) {
            url.searchParams.set("partnerId", partnerId);
        }
        const response = await this.fetch(
            url,
            {
                method: "GET",
                headers
            }
        );
        ok(response.ok, "listSystemLogs response not ok");
        return response.json();
    }

    async background(query?: Record<string, string> | URLSearchParams): Promise<void> {
        const url = new URL(
            "/api/background",
            this.baseUrl
        );
        url.search = new URLSearchParams(query).toString();
        const response = await this.fetch(url)
        ok(response.ok, "background response not ok");
        await response.blob();
    }

    async fetch(givenUrl: URL | string, options?: RequestInit) {
        const {
            baseUrl,
            headers
        } = this;
        const url = new URL(
            givenUrl,
            baseUrl
        );
        return await fetch(
            url,
            {
                method: "GET",
                headers,
                ...options
            }
        );
    }

    async addOffer(offer: OfferData): Promise<Offer> {
        const response = await this.fetch(
            `${this.prefix}/offers`,
            {
                method: "POST",
                body: JSON.stringify(offer)
            }
        );
        ok(response.ok, "addOffer response not ok");
        return await response.json();
    }

    async setOffer(offer: Offer): Promise<Offer> {
        const response = await this.fetch(
            `${this.prefix}/offers/${offer.offerId}`,
            {
                method: "PUT",
                body: JSON.stringify(offer)
            }
        );
        ok(response.ok, "setOffer response not ok");
        return await response.json();
    }

    async patchOffer(offer: Pick<Offer, "offerId"> & Partial<Offer>): Promise<Offer> {
        const response = await this.fetch(
            `${this.prefix}/offers/${offer.offerId}`,
            {
                method: "PATCH",
                body: JSON.stringify(offer)
            }
        );
        ok(response.ok, "addOffer response not ok");
        return await response.json();
    }

    async listOffers(): Promise<Offer[]> {
        const response = await this.fetch(
            `${this.prefix}/offers`
        );
        ok(response.ok, "listOffers response not ok");
        return response.json();
    }

    async addProduct(product: ProductData): Promise<Product> {
        const response = await this.fetch(
            `${this.prefix}/products`,
            {
                method: "POST",
                body: JSON.stringify(product)
            }
        );
        ok(response.ok, "addProduct response not ok");
        return await response.json();
    }

    async setProduct(product: Product): Promise<Product> {
        const response = await this.fetch(
            `${this.prefix}/products/${product.productId}`,
            {
                method: "PUT",
                body: JSON.stringify(product)
            }
        );
        ok(response.ok, "setProduct response not ok");
        return await response.json();
    }

    async patchProduct(product: Pick<Product, "productId"> & Partial<Product>): Promise<Product> {
        const response = await this.fetch(
            `${this.prefix}/products/${product.productId}`,
            {
                method: "PATCH",
                body: JSON.stringify(product)
            }
        );
        ok(response.ok, "patchProduct response not ok");
        return await response.json();
    }

    async listProducts(): Promise<Product[]> {
        const response = await this.fetch(
            `${this.prefix}/products`
        );
        ok(response.ok, "listProducts response not ok");
        return response.json();
    }

}