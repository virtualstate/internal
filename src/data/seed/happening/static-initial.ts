import {
  Partner,
  getPartnerStore,
  Organisation,
  getOrganisationStore,
  OrganisationData,
} from "../../data";
import { v5 } from "uuid";
import {isArray, ok} from "../../../is";
import { dirname, join, extname } from "node:path";
import {readdir, readFile} from "node:fs/promises";

const { pathname } = new URL(import.meta.url);
const directory = dirname(pathname);

const firstSeedingDate = new Date(1683589864494).toISOString();
export const createdAt = firstSeedingDate;
export const updatedAt = new Date().toISOString();

// Stable uuid namespace
export const namespace = "536165e4-aa2a-4d17-ad7e-751251497a11";

const approvedAt = createdAt;
const organisationData: (OrganisationData & { partner?: boolean })[] = [
  {
    organisationName: "Open Network",
    partner: true,
    website: "https://opennetwork.dev",
    approvedAt,
    approved: true,
    countryCode: "NZ"
  },
  {
    organisationName: "Virtual State",
    partner: true,
    website: "https://virtualstate.dev",
    approvedAt,
    approved: true,
    countryCode: "NZ"
  },
  {
    organisationName: "Social Baking",
    partner: true,
    website: "https://www.reddit.com/r/MedicalCannabisNZ/",
    approvedAt,
    approved: true,
    countryCode: "NZ"
  },
  {
    organisationName: "Example",
    partner: true,
    website: "https://example.gen.nz",
    approvedAt,
    approved: true,
    countryCode: "NZ"
  },
  {
    organisationName: "Develop NZ",
    partner: true,
    website: "https://dev.elop.nz",
    approvedAt,
    approved: true,
    countryCode: "NZ"
  },
  {
    organisationName: "Patient NZ",
    partner: true,
    website: "https://patient.nz",
    approvedAt,
    approved: true,
    countryCode: "NZ"
  }
];

const partners = organisationData
  .filter(({ partner }) => partner)
  .map(
    ({
      organisationName,
      approved,
      approvedAt,
    }: OrganisationData): Partner => ({
      partnerName: organisationName,
      partnerId: v5(organisationName, namespace),
      organisationId: v5(organisationName, namespace),
      createdAt,
      updatedAt,
      approved,
      approvedAt,
    })
  );

ok(partners.length);

export const organisations = organisationData.map(
  ({ organisationName, partner, ...data }): Organisation => ({
    ...data,
    organisationName,
    partnerId: partner ? v5(organisationName, namespace) : undefined,
    organisationId: v5(organisationName, namespace),
    createdAt,
    updatedAt,
  })
);

export function getPartner(name: string): Partner | undefined {
  const found = partners.find((partner) => partner.partnerName === name);
  if (!found && name.includes("t/a")) {
    const [baseName, tradingAs] = name.split("t/a");
    try {
      return getPartner(tradingAs.trim());
    } catch {
      return getPartner(baseName.trim());
    }
  }
  if (!found && name.endsWith("Limited")) {
    return getPartner(name.replace("Limited", "").trim());
  }
  if (!found && name.endsWith("Ltd")) {
    return getPartner(name.replace("Ltd", "").trim());
  }
  ok(found, `Expected partner ${name}`);
  return found;
}

export function getOrganisation(name: string): Organisation | undefined {
  const found = organisations.find(
    (organisation) => organisation.organisationName === name
  );
  if (!found && name.includes("t/a")) {
    const [baseName, tradingAs] = name.split("t/a");
    try {
      return getOrganisation(tradingAs.trim());
    } catch {
      return getOrganisation(baseName.trim());
    }
  }
  if (!found && name.endsWith("Limited")) {
    return getOrganisation(name.replace("Limited", "").trim());
  }
  if (!found && name.endsWith("Ltd")) {
    return getOrganisation(name.replace("Ltd", "").trim());
  }
  ok(found, `Expected organisation ${name}`);
  return found;
}

export function getPartnerId(name: string) {
  return getPartner(name).partnerId;
}

export async function seedPartners() {
  const partnerStore = getPartnerStore();
  const organisationStore = getOrganisationStore();

  async function putPartner(data: Partner) {
    const { partnerId } = data;
    const existing = await partnerStore.get(partnerId);
    if (existing && !isChange(data, existing)) {
      return;
    }
    const partner: Partner = {
      ...existing,
      ...data,
      updatedAt,
    };
    await partnerStore.set(partnerId, partner);
  }

  async function putOrganisation(data: Organisation) {
    const { organisationId } = data;
    const existing = await organisationStore.get(organisationId);
    const organisation: Organisation = {
      ...existing,
      ...data,
      updatedAt,
    };
    await organisationStore.set(organisationId, organisation);
  }

  await Promise.all(organisations.map(putOrganisation));

  await Promise.all(partners.map(putPartner));
}

export async function seed() {
  await seedPartners();
}

const IGNORE_KEYS: string[] = ["updatedAt", "createdAt"];

function isChange(
  left: Record<string, unknown>,
  right: Record<string, unknown>
) {
  return !Object.entries(left)
    .filter((pair) => !IGNORE_KEYS.includes(pair[0]))
    .every(([key, value]) => right[key] === value);
}
