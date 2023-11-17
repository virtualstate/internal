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
    listSystemLogs(): Promise<SystemLog[]>;
    background(query: Record<string, string> | URLSearchParams): Promise<void>;
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
