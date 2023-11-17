import { FastifyRequest } from "fastify";
import {useData, useError, useInput, useMaybeBody, useMaybeResult, useSubmitted, useTimezone} from "../../data";
import {
  FormMetaData,
  addFormMeta,
  MembershipData, FormMeta,
  addMembership, Membership
} from "../../../../data";
import {ok} from "../../../../is";
import {DateTime} from "luxon";

export const path = "/membership/create";

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


export interface MembershipFormMetaData extends MembershipData {

}

function assertMembership(value: unknown): asserts value is MembershipFormMetaData {
  ok<MembershipFormMetaData>(value);
}

export async function submit(request: FastifyRequest) {
  const data = request.body;
  assertMembership(data);

  const membership = await addMembership({
    ...data
  });

  return { success: true, membership };
}

export function CreateMembershipPage() {
  const body = useMaybeBody<MembershipFormMetaData>();
  const timezone = useTimezone();
  const submitted = useSubmitted();
  const result = useMaybeResult<{ success: boolean; membership: Membership }>();
  const error = useError();
  const { url } = useData();
  const formTarget = new URL(url);
  formTarget.hash = "#action-section";

  console.error(error);

  return <MembershipBody body={result?.success ? undefined : body} />

  function MembershipBody({ body }: { body?: MembershipFormMetaData }) {
    return (
        <form name="membership" action={formTarget.toString()} method="post">
          <div className="flex flex-col">
            <label className={FORM_GROUP_CLASS}>
              <span className="text-gray-700">Name</span>
              <input
                  className={FORM_CLASS}
                  type="text"
                  name="name"
                  placeholder="Name"
                  defaultValue={body?.name || ""}
              />
            </label>
            {/*<label className={FORM_GROUP_CLASS}>*/}
            {/*  <span className="text-gray-700">What kind of membership is it?</span>*/}
            {/*  <select name="type" className={FORM_CLASS} defaultValue="membership">*/}
            {/*    <option value="membership">Membership</option>*/}
            {/*  </select>*/}
            {/*</label>*/}
            <label className={FORM_GROUP_CLASS}>
              <span className="text-gray-700">Email</span>
              <input
                  className={FORM_CLASS}
                  type="email"
                  name="email"
                  placeholder="Email"
                  defaultValue={body?.email || ""}
              />
            </label>
            <label className={FORM_GROUP_CLASS}>
              <span className="text-gray-700">What timezone is the member in?</span>
              <select name="timezone" className={FORM_CLASS} defaultValue={body?.timezone || timezone}>
                <option value="Pacific/Auckland">Pacific/Auckland</option>
              </select>
            </label>
          </div>
          <div id="action-section">
            <button
                type="submit"
                className="bg-sky-500 hover:bg-sky-700 px-4 py-2.5 text-sm leading-5 rounded-md font-semibold text-white"
            >
              Create Membership
            </button>
          </div>
          {
            result?.membership ? (
                <div slot="alert"
                     className="rounded-md relative isolate flex items-center gap-x-6 overflow-hidden bg-blue-100 px-6 py-2.5 sm:px-3.5 justify-center mb-5 bg-gray-0--">
                  <a href={`/membership/${result.membership.membershipId}`} target="_blank"
                     className="text-sm leading-6 text-gray-900 whitespace-nowrap font-semibold">
                    Membership created for {result.membership.name} with member id "{result.membership.reference}"!&nbsp;<span aria-hidden="true">&rarr;</span>
                  </a>
                </div>
            ) : undefined
          }
        </form>
    )
  }
}

export const Component = CreateMembershipPage;