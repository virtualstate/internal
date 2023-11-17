import { Happening } from "../../../client/components/happening";
import {useInput, useTimezone} from "../../data";
import { HappeningTree, listAppointmentTrees} from "../../../../data";
import {FastifyRequest} from "fastify";
import {isLike} from "../../../../is";

export const path = "/appointments";
export const anonymous = true;

type Schema = {
  Querystring: {
    type?: string
  }
}

export async function handler(request: FastifyRequest<Schema>) {
  const { type: string } = request.query;
  const type = string?.split(",").filter<string>(isLike)
  return listAppointmentTrees({ type });
}

export function AppointmentsPage() {
  const result = useInput<HappeningTree[]>();
  return (
      <div className="flex flex-col">
        <a href="/appointment/create">Create Appointment</a>
        <div className="flex flex-col divide-y">
          {result.map(
              (result, index) => (
                  <a href={`/appointment/${result.id}`} key={index}>
                    <Happening happening={result} />
                  </a>
              )
          )}
        </div>
      </div>
  )
}

export const Component = AppointmentsPage;