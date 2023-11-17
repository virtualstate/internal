
import {useInput, useTimezone} from "../../data";
import { Membership, listMemberships} from "../../../../data";
import {FastifyRequest} from "fastify";
import {isLike} from "../../../../is";
import {membership} from "../../../../data/membership/schema";

export const path = "/memberships";
export const anonymous = true;

type Schema = {
  Querystring: {
    type?: string
  }
}

export async function handler(request: FastifyRequest<Schema>) {
  const { type: string } = request.query;
  const type = string?.split(",").filter<string>(isLike)
  return listMemberships({ type });
}

interface MembershipItemProps {
    membership: Membership
}

function MembershipItem(props: MembershipItemProps) {
    return <a href={`/membership/${props.membership.membershipId}`}>{props.membership.reference}: {props.membership.name}</a>
}

export function MembershipsPage() {
  const result = useInput<Membership[]>();
  return (
      <div className="flex flex-col">
        <a href="/membership/create">Create Membership</a>
        <div className="flex flex-col divide-y">
          {result.map(
              (result, index) => (
                  <MembershipItem membership={result} key={index} />
              )
          )}
        </div>
      </div>
  )
}

export const Component = MembershipsPage;