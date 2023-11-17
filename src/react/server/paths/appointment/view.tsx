import { FastifyRequest } from "fastify";
import {useConfig, useData, useInput} from "../../data";
import {AppointmentTree, getAppointmentTree} from "../../../../data";
import {UserCircleIcon, CalendarDaysIcon, ClockIcon} from "../../../client/components/icons";
import {DateTime} from "luxon";
import {FunctionComponent} from "react";

export interface AppointmentActionProps {
  appointment: AppointmentTree;
}
export type AppointmentActionsComponentFn = FunctionComponent<AppointmentActionProps>

export interface AppointmentViewComponentConfig {
  AppointmentActions?: AppointmentActionsComponentFn;
}

export const path = "/appointment/:appointmentId";
export const anonymous = true;

const {
  DEFAULT_TIMEZONE = "Pacific/Auckland"
} = process.env;
const TIME_FORMAT = "h:mm a";
const DATE_FORMAT = "dd MMMM yyyy";

type Schema = {
  Params: {
    appointmentId: string
  }
}

export async function handler(request: FastifyRequest<Schema>) {
  const { appointmentId } = request.params;
  return getAppointmentTree(appointmentId);
}

export function getAppointmentDate(appointment: AppointmentTree) {
  const timezone = appointment.timezone || DEFAULT_TIMEZONE;
  let date,
      dateString,
      time,
      timeString;
  const startAt = appointment.startedAt || appointment.startAt;
  const endAt = appointment.endAt || appointment.endedAt;
  if (startAt) {
    date = startAt;
    const startInstance = DateTime.fromJSDate(
        new Date(startAt),
        { zone: timezone }
    );
    if (endAt) {
      const endInstance = DateTime.fromJSDate(
          new Date(endAt),
          { zone: timezone }
      );
      const diff = endInstance.diff(startInstance);
      const minutes = Math.abs(diff.as("minutes"));
      const hours = Math.abs(diff.as("hours"));
      const days = Math.abs(diff.as("days"));
      dateString = `${startInstance.toFormat(TIME_FORMAT)} - ${endInstance.toFormat(TIME_FORMAT)}, ${startInstance.toFormat(DATE_FORMAT)}`;
      time = diff.toISO()
      if (minutes < 60) {
        if (minutes > 1) {
          timeString = `${Math.round(minutes)} minutes`;
        }
      } else if (hours < 24) {
        if (hours >= 1) {
          timeString = `${Math.round(hours)} hour${hours === 1 ? "" : "s"}`;
        }
      } else {
        dateString = `${startInstance.toFormat(TIME_FORMAT)} ${startInstance.toFormat(DATE_FORMAT)} - ${endInstance.toFormat(TIME_FORMAT)} ${endInstance.toFormat(DATE_FORMAT)}`;
        if (days >= 1) {
          timeString = `${Math.round(days * 10) / 10} day${days === 1 ? "" : "s"}`;
        }
      }
    } else {
      dateString = `${startInstance.toFormat(TIME_FORMAT)}, ${startInstance.toFormat(DATE_FORMAT)}`;
    }
  } else {
    const endInstance = DateTime.fromJSDate(
        new Date(endAt),
        { zone: timezone }
    );
    date = endAt;
    dateString = `Ends at ${endInstance.toFormat(TIME_FORMAT)}, ${endInstance.toFormat(DATE_FORMAT)}`;
  }

  return {
    date,
    dateString,
    time,
    timeString
  }
}

export function AppointmentPage() {
  const appointment = useInput<AppointmentTree>();

  const { url } = useData();
  const { pathname } = new URL(url);
  const { AppointmentActions } = useConfig();

  const {
    date,
    dateString,
    time,
    timeString,
  } = getAppointmentDate(appointment);

  const status = appointment.status || "scheduled";
  const isFinished = status === "completed";
  const statusString = (appointment.status || "scheduled").replace(/^([a-z])/, (string) => string.toUpperCase());

  return(
      <div className="lg:col-start-3 lg:row-end-1">
        <h2 className="sr-only">Summary</h2>
        <div className="rounded-lg bg-gray-50 shadow-sm ring-1 ring-gray-900/5">
          <dl className="flex flex-wrap">
            <div className="flex-none self-end px-6 pt-4">
              <dt className="sr-only">Status</dt>
              <dd className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                {statusString}
              </dd>
            </div>
            <div className="mt-6 flex w-full flex-none gap-x-4 border-t border-gray-900/5 px-6 pt-6">
              <dt className="flex-none">
                <span className="sr-only">Attendees</span>
                <UserCircleIcon className="h-6 w-5 text-gray-400" aria-hidden="true" />
              </dt>
              <dd className="text-sm font-medium leading-6 text-gray-900">
                {appointment.attendees.map((attendee, index, array) => {
                  const isLast = index === (array.length - 1);
                  return (
                      <span key={index}>
                        {isLast ? "and " : ""}
                        <span>{attendee.name || attendee.email || attendee.reference}</span>
                        {!isLast ? ", " : undefined}
                      </span>
                  )
                })}
              </dd>
            </div>
            <div className="mt-4 flex w-full flex-none gap-x-4 px-6">
              <dt className="flex-none">
                <span className="sr-only">Date</span>
                <CalendarDaysIcon className="h-6 w-5 text-gray-400" aria-hidden="true" />
              </dt>
              <dd className="text-sm leading-6 text-gray-500">
                <time dateTime={date}>{dateString}</time>
              </dd>
            </div>
            {
              timeString ? (
                  <div className="mt-4 flex w-full flex-none gap-x-4 px-6">
                    <dt className="flex-none">
                      <span className="sr-only">Duration</span>
                      <ClockIcon className="h-6 w-5 text-gray-400" aria-hidden="true" />
                    </dt>
                    <dd className="text-sm leading-6 text-gray-500">
                      <time dateTime={time}>{timeString}</time>
                    </dd>
                  </div>
              ) : undefined
            }
          </dl>
          {
            AppointmentActions ? (
              <AppointmentActions appointment={appointment} />
            ) : (
               status === "cancelled" ? (
                   <div className="border-t border-gray-900/5 mt-6 px-6 py-6 flex flex-col">
                     <a href={`/api/version/1/appointments/${appointment.id}/status/scheduled?redirect=${pathname}`} className="text-sm font-semibold leading-6 text-gray-900">
                       Reschedule appointment <span aria-hidden="true">&rarr;</span>
                     </a>
                   </div>
               ) : (
                   status === "scheduled" ? (
                       <div className="border-t border-gray-900/5 mt-6 px-6 py-6 flex flex-col">
                         <a href={`/api/version/1/appointments/${appointment.id}/status/cancelled?redirect=${pathname}`} className="text-sm font-semibold leading-6 text-gray-900">
                           Cancel appointment <span aria-hidden="true">&rarr;</span>
                         </a>
                       </div>
                   ) : (
                       status === "deferred" ? (
                           <div className="border-t border-gray-900/5 mt-6 px-6 py-6 flex flex-col">
                             <a href={`/api/version/1/appointments/${appointment.id}/status/scheduled?redirect=${pathname}`} className="text-sm font-semibold leading-6 text-gray-900">
                               Reschedule deferred appointment <span aria-hidden="true">&rarr;</span>
                             </a>
                           </div>
                       ) : undefined
                   )
               )
            )
          }
        </div>
      </div>
  )
}

export const Component = AppointmentPage;