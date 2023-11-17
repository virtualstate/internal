import { FastifyRequest } from "fastify";
import { Happening } from "../../client/components/happening";
import { useInput, useTimezone } from "../data";
import { getHappeningTree, HappeningTree } from "../../../data";

export const path = "/happening/:happeningId";
export const anonymous = true;

type Schema = {
  Params: {
    happeningId: string
  }
}

export async function handler(request: FastifyRequest<Schema>) {
  const { happeningId } = request.params;
  return getHappeningTree(happeningId);
}

export function HappeningPage() {
  const result = useInput<HappeningTree>();
  return <Happening happening={result} />
}

export const Component = HappeningPage;