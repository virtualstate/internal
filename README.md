# @virtualstate/internal 

[//]: # (badges)

### Support

 ![Node.js supported](https://img.shields.io/badge/node-%3E%3D18.7.0-blue) ![Bun supported](https://img.shields.io/badge/bun-%3E%3D1.0.2-blue) 

### Test Coverage



[//]: # (badges)

### Client

```typescript
import { Client } from "@virtualstate/internal/client";

const client = new Client({
    url: process.env.API_URL || "http://localhost:3000"
});

const products = await client.listProducts();

console.log({ products });
```



<details><summary>Client TypeScript Types</summary>

[//]: # (typescript client)

```typescript
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

export type AppointmentType =
    | "appointment"
    | string

export type AppointmentStatus =
    | "pending"
    | "confirmed"
    | "scheduled"
    | "deferred"
    | "cancelled"
    | "completed"
    | string

export interface AppointmentHistoryItem extends HappeningEventData {
  status: AppointmentStatus;
  statusAt?: string;
  updatedAt: string;
}

export interface AppointmentData extends HappeningData {
  type: AppointmentType
  organisationId?: string;
  attendees: string[];
  attended?: boolean;
  attendedAt?: string;
  status?: AppointmentStatus;
  history?: AppointmentHistoryItem[];
  locationId?: string;
}

export interface Appointment extends AppointmentData {
  appointmentId: string;
  createdAt: string;
  updatedAt: string;
  status: AppointmentStatus;
  statusAt: string;
  history: AppointmentHistoryItem[];
}

export interface AppointmentAvailabilityData extends AppointmentData {

}

export interface AppointmentAvailability extends AppointmentAvailabilityData {
  appointmentAvailabilityId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendeeData extends Record<string, unknown> {
    reference: string;
    name?: string;
    email?: string;
}

export interface Attendee extends AttendeeData {
    attendeeId: string;
    createdAt: string;
    createdByPartnerId?: string;
    createdByUserId?: string;
}

export type PartialAttendee = AttendeeData & Partial<Attendee>;

export type SystemRole = "system";

declare global {
    interface AuthenticationRoles extends Record<SystemRole, SystemRole> {

    }
}

export type AuthenticationRole =
  | "moderator"
  | "admin"
  | "owner"
  | "member"
  | "booster"
  | "industry"
  | "developer"
  | "coordinator"
  | "partner"
  | "anonymous"
  | SystemRole
  // Allows typing of authentication roles from the global scope.
  // keys from multiple interface definitions in global will merge together
  | keyof AuthenticationRoles;

export interface UserAuthenticationRoleData extends Expiring {
    userId: string;
    roles: AuthenticationRole[];
}

export interface UserAuthenticationRole extends UserAuthenticationRoleData {
    createdAt: string;
    updatedAt: string;
}

export type PartialUserAuthenticationRole = UserAuthenticationRoleData & Partial<UserAuthenticationRole>

export type AttendeeAuthorisationType = "attendee";
export type HappeningAuthorisationType = "happening";

export type AuthorisationType = AttendeeAuthorisationType | HappeningAuthorisationType;

export interface AuthorisationData {
    type: AuthorisationType;
    attendeeId?: string;
    happeningId?: string;
    notifications?: AuthorisationNotificationData[];
}

export interface Authorisation extends AuthorisationData {
    authorisationId: string;
    createdAt: string;
    updatedAt: string;
    notifiedAt?: string;
    declinedAt?: string;
    authorisedAt?: string;
}

export type AuthorisationNotificationType = (
    | "payment"
    | "message"
);

export interface AuthorisationNotificationData extends Record<string, unknown> {
    type: AuthorisationNotificationType;
}

export interface AuthorisationNotification extends AuthorisationNotificationData {
    notificationId: string;
    authorisationId: string;
    createdAt: string;
    stateId?: string;
}

export type ChangeStatus = "pending" | "applied" | "cancelled" | string;

export interface ChangeOptionData extends Record<string, unknown> {
  type?: string;
}

export interface ChangeTargetType {
  type: string;
}

export interface ChangeTarget extends ChangeTargetType {
  id: string;
}


export interface ChangeTargetIdentifier {
  type: string;
  target: ChangeTargetType;
}

export interface ChangeData extends ChangeTargetIdentifier, Expiring {
  target: ChangeTarget;
  userId?: string;
  options?: ChangeOptionData;
  data?: Record<string, unknown>;
}

export interface Change extends ChangeData {
  status: ChangeStatus;
  changeId: string;
  createdAt: string;
  updatedAt: string;
  appliedAt?: string;
}

export interface ChangeIdentifier extends ChangeTargetIdentifier {
  changeId: string;
}

export interface DurableEventSchedule {
    timezone?: string;
    // For cases where we want an event triggered after a specific time
    after?: string;
    // For cases where we want an event triggered before a specific time
    before?: string;
    immediate?: boolean;
    cron?: string;
    delay?: number | string;
    // Once delay has completed, repeat
    repeat?: boolean;
}

export interface UnknownEvent {
    type: unknown;
}

export interface DurableEventTypeData extends UnknownEvent {
    type: string;
}

export interface DurableEventData extends Record<string, unknown>, DurableEventTypeData, Expiring {
    timeStamp?: number;
    durableEventId?: string;
    schedule?: DurableEventSchedule;
    retain?: boolean;
    virtual?: boolean;
    serviceWorkerId?: string;
    createdAt?: string;
}

export interface DurableEvent extends DurableEventData {
    durableEventId: string
}

export type DurableBodyLike = string | DurableBody;

export interface DurableRequestData extends Expiring {
    url: string;
    method?: string;
    headers?: Record<string, string>
    body?: DurableBodyLike;
    response?: DurableResponseData;
}

export interface DurableResponseCache {
    name: string;
}

export interface DurableBody {
    type: "file" | "base64" | "cache";
    value: string;
    url?: string;
}

export interface DurableResponseData extends Pick<Response, "url" | "status" | "statusText"> {
    headers?: Record<string, string>
    body?: DurableBodyLike;
}

export interface DurableRequest extends DurableRequestData {
    durableRequestId: string;
    createdAt: string;
    updatedAt: string;
}

export interface RequestQueryInfo extends DurableRequestData {

}

export type RequestQuery = RequestQueryInfo | RequestInfo | URL

export type PartialDurableRequest = DurableRequestData & Partial<DurableRequest>;

export interface Expiring {
    expiresAt?: string;
}

export type BaseFileStoreType = "product" | "inventory" | "productFile" | "inventoryFile" | "offer" | "offerFile" | "inventoryItem" | "order" | "orderItem" | "service"
export type BaseFileRemoteSourceName = "discord" | BaseFileStoreType;
export type RemoteFileSourceName = BaseFileRemoteSourceName | `${BaseFileRemoteSourceName}_${number}`;

export type FileUploadedSynced = "r2" | "disk";
export type FileType = BaseFileStoreType | `${RemoteFileSourceName}_import`;

export interface ResolvedFilePart extends Record<string, unknown> {

}

export interface FileImageSize extends Expiring {
  width: number;
  height: number;
  signed?: boolean;
  fileName?: string;
  checksum?: Record<string, string>
}

export interface FileSize extends FileImageSize {
  url: string;
  synced: FileUploadedSynced;
  syncedAt: string;
  version: number;
  watermark?: boolean;
  copyright?: string;
  license?: string;
  fileName?: string;
  signed?: boolean;
}

export interface FileErrorDescription {
  stack?: string;
  message: string;
  createdAt: string;
  repeated?: number;
}

export interface FileData extends Record<string, unknown>, Partial<FileImageSize> {
  fileName: string;
  contentType?: string;
  size?: number;
  path?: string;
  url?: string;
  pinned?: boolean;
  uploadedAt?: string;
  uploadedByUsername?: string;
  source?: RemoteFileSourceName;
  sourceId?: string;
  synced?: FileUploadedSynced;
  syncedAt?: string;
  version?: number;
  type?: FileType | string;
  sizes?: FileSize[];
  /** @deprecated use remoteUrl */
  externalUrl?: string;
  remoteUrl?: string;
  reactionCounts?: Record<string, number>;
  reactionCountsUpdatedAt?: string;
  resolved?: ResolvedFilePart[];
  resolvedAt?: string;
  errors?: FileErrorDescription[];
  description?: string;
  fileId?: string;
}

export interface File extends FileData {
  fileId: string;
  createdAt: string;
  updatedAt: string;
  uploadedAt: string;
}

export interface ResolvedFile extends File {
  url: string;
  synced: FileUploadedSynced;
}

export interface FormMetaData extends Record<string, unknown> {}

export interface FormMeta extends FormMetaData {
  formMetaId: string;
  userId?: string;
  partnerId?: string;
  createdAt: string;
  updatedAt: string;
}

export type HappeningType = (
    | "event"
    | "ticket"
    | "appointment"
    | "poll"
    | "payment"
    | "bill"
    | "activity"
    | "report"
    | "availability"
    | "intent"
    | "swap"
);

export interface HappeningTreeData extends HappeningEventData {
    type?: HappeningType | string;
    attendees?: (string | AttendeeData)[]
    children?: (string | HappeningTreeData)[]
}

export interface HappeningOptionData extends Record<string, unknown> {
    type?: HappeningType | string;
}

export interface HappeningEventData extends Expiring, Record<string, unknown> {
    startAt?: string // Intended start time
    startedAt?: string // Actual start time
    endAt?: string // Intended end time
    endedAt?: string // Actual end time
    createdAt?: string
    type?: HappeningType | string;
    reference?: string;
    url?: string;
    title?: string;
    description?: string;
    timezone?: string;
    options?: HappeningOptionData[];
}

export interface HappeningData extends HappeningEventData {
    type?: HappeningType | string;
    parent?: string
    children?: string[];
    attendees?: string[];
    partnerId?: string;
    organisationId?: string;
    userId?: string;
}

export interface Happening extends HappeningData {
    type: HappeningType | string;
    happeningId: string;
}

export type PartialHappening = HappeningData & Partial<Happening>

export interface HappeningTreeNoKey extends HappeningEventData {
    type: string;
    parent?: HappeningTree;
    children: HappeningTree[];
    attendees: Attendee[];
    partnerId?: string;
    partner?: Partner;
    organisation?: Organisation;
    userId?: string;
}

export interface HappeningTree extends HappeningTreeNoKey {
    id: string;
    type: HappeningType | string;
}

export interface Identifier {
    type: string;
    identifier: string;
    identifiedAt: string;
}

export type InventoryType =
    | "inventory"
    | "picking"
    | "packing"
    | "transit"

export interface InventoryData {
  type: InventoryType
  userId?: string;
  organisationId?: string;
  locationId?: string;
  items?: (InventoryItemIdentifierData & Partial<InventoryItem>)[];
}

export interface Inventory extends InventoryData {
  inventoryId: string;
  createdAt: string;
  updatedAt: string;
}

export type InventoryItemStatus =
    | "pending"
    | "available"
    | "processing"
    | "split"
    | "void";

export interface InventoryItemIdentifierData {
  productId?: string;
  offerId?: string; // Allows a bundled offer to be stored as inventory
  quantity?: number; // Default 1
  identifiers?: Identifier[]; // Default []
}

export interface InventoryItemData extends InventoryItemIdentifierData {
  inventoryId: string;
  status?: InventoryItemStatus;
  // Record where it came from and was sent to
  from?: ShipmentFrom;
  to?: ShipmentTo | ShipmentTo[];
}

export interface InventoryItem extends InventoryItemData {
  inventoryItemId: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryProduct extends InventoryItem {
  productId: string;
}

export interface InventoryOffer extends InventoryItem {
  offerId: string;
}

export type SetInventoryItem = InventoryItemData & Pick<InventoryItem, "inventoryId" | "inventoryItemId"> & Partial<InventoryItem>;

export type LocationType =
    | "place"
    | "inventory"
    | "packing"
    | "picking"

export interface LocationData extends Record<string, unknown> {
  type: LocationType
  locationName?: string;
  address?: string[];
  countryCode?: string;
  organisationId?: string;
  userId?: string;
}

export interface Location extends LocationData {
  locationId: string;
  createdAt: string;
  updatedAt: string;
}

export type MembershipStatus = "active" | "inactive";

export interface MembershipHistoryItem {
    status: MembershipStatus;
    statusAt?: string;
    updatedAt: string;
}

export interface MembershipData extends Record<string, unknown> {
    status?: MembershipStatus;
    reference?: string;
    name?: string;
    email?: string;
    timezone?: string;
    history?: MembershipHistoryItem[];
}

export interface Membership extends MembershipData {
    status: MembershipStatus;
    reference: string;
    membershipId: string;
    createdAt: string;
    createdByPartnerId?: string;
    createdByUserId?: string;
    updatedAt: string;
}

export type PartialMembership = MembershipData & Partial<Membership>;

export type MaybeNumberString = `${number}` | string;

export interface OfferPrice {
  price: MaybeNumberString;
  locale?: string;
  currency: string;
  currencyCode?: string;
  currencySymbol?: string;
  countryCode?: string;
}

export interface TotalOfferPrice extends OfferPrice {
  total?: MaybeNumberString;
}

export interface ProductOfferItem {
  type: "product";
  productId: string;
  quantity?: number;
  identifiers?: Identifier[];
}

export interface ServiceOfferItem {
  type: "service";
  serviceId: string;
  quantity?: number;
  identifiers?: Identifier[];
}

export type OfferItem =
    | ProductOfferItem
    | ServiceOfferItem

export type OfferItemType = OfferItem["type"];

export type OfferStatus =
    | "speculative"
    | "preSale"
    | "preOrder"
    | "onlineOnly"
    | "storeOnly"
    | "available"
    | "backOrder"
    | "limitedAvailability"
    | "soldOut"
    | "void"
    | string;

export interface OfferData extends Record<string, unknown>, Partial<OfferPrice> {
  status: OfferStatus;
  items: OfferItem[];
  // The user that is providing this offer
  userId?: string;
  // The organisation that is providing this offer
  organisationId?: string;
  offerName?: string;
  // Is the offer publicly visible
  public?: boolean;
  countryCode?: string;
  // Offer can be from one party to another
  from?: ShipmentFrom;
  to?: ShipmentTo;
}

export interface Offer extends OfferData {
  offerId: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = "pending" | "submitted" | "processing" | "complete" | string;

export interface OrderData {
  status: OrderStatus;
  reference?: string;
  to?: ShipmentTo;
  // Is it from a specific known location?
  from?: ShipmentFrom;
  // Partial in progress payment data, before the payment method is created or matched
  paymentMethod?: Partial<PaymentMethodData>
  // Partial in progress payment data, before the payment request is created or matched
  paymentRequest?: Partial<PaymentRequestData>
  paymentId?: string;
  paymentRequestId?: string;
  paymentMethodId?: string;
}

export interface Order extends OrderData, Partial<TotalOfferPrice> {
  orderId: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  products?: OrderProductItem[];
  services?: OrderServiceItem[];
}

export interface OrderItemIdentifierData {
  productId?: string;
  serviceId?: string;
  offerId?: string;
  quantity?: number; // Default 1
  identifiers?: Identifier[]; // Default []
}

export interface OrderItemData extends OrderItemIdentifierData, Record<string, unknown> {
  orderId: string;
}

export interface OrderItem extends OrderItemData {
  orderItemId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderProductItem extends OrderItem {
  productId: string;
}

export interface OrderServiceItem extends OrderItem {
  serviceId: string;
}

export interface OrderOfferItem extends OrderItem {
  offerId: string;
}

export type SetOrderItem = OrderItemData & Pick<OrderItem, "orderId" | "orderItemId"> & Partial<OrderItem>;

export interface OrganisationBaseData extends Record<string, unknown> {
  countryCode?: string; // "NZ"
  location?: string;
  remote?: boolean;
  onsite?: boolean;
  pharmacy?: boolean;
  delivery?: boolean;
  clinic?: boolean;
  website?: string;
  associatedBrandingTerms?: string[]; // Eg common names used to refer to the organisation by way of brand
}

export interface OrganisationData extends OrganisationBaseData {
  organisationName: string;
  partnerId?: string;
  approved?: boolean;
  approvedAt?: string;
}

export interface Organisation extends OrganisationData {
  organisationId: string;
  createdAt: string;
  updatedAt: string;
  approvedByUserId?: string;
}

export type PartialOrganisation = OrganisationData & Partial<Organisation>;

export interface PartnerData extends Record<string, unknown> {
  partnerName: string;
  countryCode?: string;
}

export interface AddPartnerData extends PartnerData, OrganisationBaseData {}

export interface Partner extends PartnerData {
  partnerId: string;
  organisationId: string;
  accessToken?: string;
  createdAt: string;
  updatedAt: string;
  approved?: boolean;
  approvedAt?: string;
  approvedByUserId?: string;
}

export type PaymentType =
    | "invoice"
    | "realtime"
    | string;

export type PaymentStatus =
    | "pending"
    | "processing"
    | "processed"
    | "paid"
    | "void"
    | string;

export interface Amount {
  amount: string;
  currency: string;
}

export interface PaymentData extends PaymentMethodIdentifier, Record<string, unknown> {
  type: PaymentType;
  status: PaymentStatus;
  totalAmount?: Amount;
  reference?: string;
  userId?: string;
  organisationId?: string;
  paymentRequestId?: string;
}

export interface PaymentIdentifier extends PaymentMethodOwnerIdentifiers {
  paymentId: string;
}

export interface Payment extends PaymentIdentifier, PaymentData {
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethodType =
    | "invoice"
    | "realtime"
    | string;

export type PaymentMethodStatus = "pending" | "available" | "expired" | "void";


export interface PaymentMethodOwnerIdentifiers {
  userId?: string;
  organisationId?: string;
}

export interface PaymentMethodIdentifier extends PaymentMethodOwnerIdentifiers {
  paymentMethodId: string;
}

export interface PaymentMethodData extends Record<string, unknown>, PaymentMethodOwnerIdentifiers {
  status: PaymentMethodStatus;
  type: PaymentMethodType;
  currency?: string;
  paymentMethodName?: string;
  issuerName?: string;
  issuerId?: string;
  issuerPaymentMethodId?: string;
  to?: ShipmentTo;
}

export interface PaymentMethod extends PaymentMethodData, PaymentMethodIdentifier {
  createdAt: string;
  updatedAt: string;
}

export type PaymentRequestType =
    | "invoice"
    | "realtime"
    | string;

export type PaymentRequestStatus = "pending" | "accepted" | "expired" | "void";

export interface PaymentRequestOwnerIdentifiers {
  userId?: string;
  organisationId?: string;
}

export interface PaymentRequestIdentifier extends PaymentRequestOwnerIdentifiers {
  paymentRequestId: string;
}

export interface PaymentRequestData extends Record<string, unknown>, PaymentRequestOwnerIdentifiers {
  status?: PaymentRequestStatus;
  types?: PaymentRequestType[];
  paymentMethodId?: string;
  to?: ShipmentTo;
  from?: ShipmentFrom;
  totalAmount?: Amount;
}

export interface PaymentRequest extends PaymentRequestData, PaymentRequestIdentifier {
  status: PaymentRequestStatus;
  types: PaymentRequestType[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductData extends Record<string, unknown> {
  productName: string;

  description?: string;

  // Is the product publicly visible
  public?: boolean;
  // Is the related not to a specific brand
  generic?: boolean;

  // User provided organisation name associated with this product
  organisationText?: string;
  // System resolved organisation name associated with this product
  organisationName?: string;
  // System associated organisation name associated with this product
  organisationId?: string;
}

export interface Product extends ProductData {
  productId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceData extends Record<string, unknown> {
  serviceName: string;

  description?: string;

  // Is the service publicly visible
  public?: boolean;
  // Is the related not to a specific brand
  generic?: boolean;

  // User provided organisation name associated with this service
  organisationText?: string;
  // System resolved organisation name associated with this service
  organisationName?: string;
  // System associated organisation name associated with this service
  organisationId?: string;
}

export interface Service extends ServiceData {
  serviceId: string;
  createdAt: string;
  updatedAt: string;
}

export type ShipmentStatus = "pending" | "processing" | "sent" | "delivered";

export interface ShipmentLocation {
  userId?: string;
  organisationId?: string;
  organisationText?: string; // User given text
  organisationName?: string; // Actual stored name
  locationId?: string;
  inventoryId?: string;
  inventoryItemId?: string;
  orderId?: string;
  address?: string[]; // Human-readable address
  countryCode?: string;
  saveAsUserDefault?: boolean;
  sameAsShipping?: boolean;
  name?: string;
  email?: string; // Yeah it is shipment information...
}

export interface ShipmentIdentifiers {
  identifiers?: Identifier[];
}

export interface ShipmentFrom extends ShipmentLocation, ShipmentIdentifiers {

}

export interface ShipmentTo extends ShipmentLocation, ShipmentIdentifiers {

}

export interface ShipmentData extends Record<string, unknown> {
  status: ShipmentStatus;
  // from is optional as you might receive with no info
  from?: ShipmentFrom;
  // A shipment would always have a destination
  to: ShipmentTo;
  identifiers?: Identifier[];
}

export interface Shipment extends ShipmentData {
  shipmentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemLogData extends Record<string, unknown> {
    uniqueCode?: string;
    value?: number;
    partnerId: string;
    message: string;
    timestamp?: string;
    action?: string;
}

export interface SystemLog extends SystemLogData {
    systemLogId: string;
    timestamp: string;
}

export type TaskType =
    | "inventory"
    | "packing"
    | "picking"
    | "order"
    | "product"
    | "offer"

export interface TaskData extends HappeningData {
  type: TaskType
  title: string;
  organisationId?: string;
  attendees: string[];
}

export interface Task extends TaskData {
  taskId: string;
  createdAt: string;
  updatedAt: string;
}
```

[//]: # (typescript client)

</details>

### Local Development

#### Dependencies

You will need to install the dependencies with [yarn](https://yarnpkg.com/)

Once you have yarn installed, use the command:

```bash
yarn
```

#### `.env`

First you will need to set up a `.env` file in the same directory as this README.md file

Copy the [`.env.example`](./.env.example) to make your `.env` file

##### Reddit

To setup reddit authentication, you will need to either be provided a client ID if you're working with the
socialbaking team, or you will need to create a [new application at the bottom of this screen](https://www.reddit.com/prefs/apps)

The local redirect url is http://localhost:3000/api/authentication/reddit/callback

Once created, copy the value under "web app" and set that as your `REDDIT_CLIENT_ID`

Copy the "secret" and set that as `REDDIT_CLIENT_SECRET`

Set the reddit community name, and associated flair, as you see fit:

```
REDDIT_NAME=MedicalCannabisNZ
REDDIT_FLAIR="Medical Patient"
```
