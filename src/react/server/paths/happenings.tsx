import { Happening } from "../../client/components/happening";
import {useInput, useTimezone} from "../data";
import {HappeningTree, HappeningType, listHappeningTrees} from "../../../data";
import {FastifyRequest} from "fastify";
import {isLike} from "../../../is";

export const path = "/happenings";
export const anonymous = true;

type Schema = {
  Querystring: {
    type?: string
  }
}

export async function handler(request: FastifyRequest<Schema>) {
  const { type: string } = request.query;
  const type = string?.split(",").filter<string>(isLike)
  return listHappeningTrees({ type });
}

export function HappeningsPage() {
  const result = useInput<HappeningTree[]>();
  return (
      <div className="flex flex-col">
        <a href="/happening/create">Create Happening</a>
        <div className="flex flex-col divide-y">
          {result.map(
              (result, index) => (
                  <a href={`/happening/${result.happeningId}`} key={index}>
                    <Happening happening={result} />
                  </a>
              )
          )}
        </div>
      </div>
  )
}

export const Component = HappeningsPage;