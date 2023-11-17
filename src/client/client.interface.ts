// Run build again or pre-build and all the data types will be available from this import
import {
    Partner,
    PartnerData,
    SystemLog,
    Product,
    ProductData,
    OfferData,
    Offer
} from "./interface.readonly";

// Client start
export interface ClientOptions {
    partnerId?: string;
    accessToken?: string;
    version?: number;
    prefix?: string;
    url?: string | URL;
}

export interface Client {
    addPartner(partner: PartnerData): Promise<Partner>;
    listPartners(): Promise<Partner[]>;
    addProduct(product: ProductData): Promise<Product>;
    setProduct(product: Product): Promise<Product>;
    patchProduct(product: Pick<Product, "productId"> & Partial<Product>): Promise<Product>;
    listProducts(): Promise<Product[]>;
    addOffer(offer: OfferData): Promise<Offer>;
    setOffer(offer: Offer): Promise<Offer>;
    patchOffer(offer: Pick<Offer, "offerId"> & Partial<Offer>): Promise<Offer>;
    listOffers(): Promise<Offer[]>;
    listSystemLogs(): Promise<SystemLog[]>;
    background(query: Record<string, string> | URLSearchParams): Promise<void>;
}