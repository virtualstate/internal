import { FastifyRequest } from "fastify";
import {useConfig, useData, useInput} from "../../data";
import {Membership, getMembership} from "../../../../data";
import {CreditCardIcon, UserCircleIcon} from "../../../client/components/icons";
import {FunctionComponent} from "react";

export interface MembershipActionProps {
  membership: Membership;
}
export type MembershipActionsComponentFn = FunctionComponent<MembershipActionProps>

export interface MembershipViewComponentConfig {
  MembershipActions?: MembershipActionsComponentFn;
}

export const path = "/membership/:membershipId";
export const anonymous = true;

type Schema = {
  Params: {
    membershipId: string
  }
}

export async function handler(request: FastifyRequest<Schema>) {
  const { membershipId } = request.params;
  return getMembership(membershipId);
}


export function MembershipPage() {
  const membership = useInput<Membership>();

  const { url } = useData();
  const { pathname } = new URL(url);
  const { MembershipActions } = useConfig();

  const status = membership.status || "inactive";
  const isActive = status === "active";
  const statusString = status.replace(/^([a-z])/, (string) => string.toUpperCase());

  return(
      <div className="lg:col-start-3 lg:row-end-1">
        <h2 className="sr-only">Membership</h2>
        <div className="rounded-lg bg-gray-50 shadow-sm ring-1 ring-gray-900/5">
          <dl className="flex flex-wrap">
            <div className="flex-none self-end px-6 pt-4">
              <dt className="sr-only">Status</dt>
              <dd className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                {statusString}
              </dd>
            </div>
            <div className="mt-4 flex w-full flex-none gap-x-4 px-6">
              <dt className="flex-none">
                <span className="sr-only">Name</span>
                <UserCircleIcon className="h-6 w-5 text-gray-400" aria-hidden="true" />
              </dt>
              <dd className="text-sm leading-6 text-gray-500">
                {membership.name}
              </dd>
            </div>
            <div className="mt-4 flex w-full flex-none gap-x-4 px-6">
              <dt className="flex-none">
                <span className="sr-only">ID</span>
                <CreditCardIcon className="h-6 w-5 text-gray-400" aria-hidden="true" />
              </dt>
              <dd className="text-sm leading-6 text-gray-500">
                {membership.reference}
              </dd>
            </div>
          </dl>
          {
            MembershipActions ? (
              <MembershipActions membership={membership} />
            ) : (
               status === "active" ? (
                   <div className="border-t border-gray-900/5 mt-6 px-6 py-6 flex flex-col">
                     <a href={`/api/version/1/memberships/${membership.membershipId}/status/inactive?redirect=${pathname}`} className="text-sm font-semibold leading-6 text-gray-900">
                       Inactivate membership <span aria-hidden="true">&rarr;</span>
                     </a>
                   </div>
               ) : (
                   status === "inactive" ? (
                       <div className="border-t border-gray-900/5 mt-6 px-6 py-6 flex flex-col">
                         <a href={`/api/version/1/memberships/${membership.membershipId}/status/active?redirect=${pathname}`} className="text-sm font-semibold leading-6 text-gray-900">
                           Activate membership <span aria-hidden="true">&rarr;</span>
                         </a>
                       </div>
                   ) : undefined
               )
            )
          }
        </div>
      </div>
  )
}

export const Component = MembershipPage;