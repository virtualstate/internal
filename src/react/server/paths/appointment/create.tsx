import { FastifyRequest } from "fastify";
import {useData, useError, useInput, useMaybeBody, useMaybeResult, useSubmitted, useTimezone} from "../../data";
import {
  FormMetaData,
  addFormMeta,
  AppointmentData, FormMeta,
  addAppointment, Appointment
} from "../../../../data";
import {ok} from "../../../../is";
import {DateTime} from "luxon";
import {DEFAULT_TIMEZONE} from "../../../../config";

export const path = "/appointment/create";

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


export interface AppointmentFormMetaData extends FormMetaData, AppointmentData {

}

function assertAppointment(value: unknown): asserts value is AppointmentFormMetaData {
  ok<AppointmentFormMetaData>(value);
  ok(value.timezone, "Expected timezone");
}

export async function submit(request: FastifyRequest) {
  const data = request.body;
  assertAppointment(data);

  const { timezone, startAt, startedAt, endAt, endedAt } = data;

  const appointmentData: AppointmentData = {
    ...data
  };

  if (startAt) {
    appointmentData.startAt = fromWebDate(startAt, timezone);
  }
  if (startedAt) {
    appointmentData.startedAt = fromWebDate(startedAt, timezone);
  }
  if (endAt) {
    appointmentData.endAt = fromWebDate(endAt, timezone);
  }
  if (endedAt) {
    appointmentData.endedAt = fromWebDate(endedAt, timezone);
  }

  const appointment = await addAppointment(appointmentData);
  console.log({ appointment });

  return { success: true, appointment };


}

export function fromWebDate(value?: string, timezone?: string) {
  if (!value) return undefined;
  let date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date = DateTime.fromFormat(value, "yyyy-MM-dd", { zone: timezone || DEFAULT_TIMEZONE }).toJSDate();
  } else {
    date = DateTime.fromJSDate(new Date(value), { zone: timezone || DEFAULT_TIMEZONE }).toJSDate();
  }
  // Use a consistent format
  return date.toISOString()
}

export function CreateAppointmentPage() {
  const body = useMaybeBody<AppointmentFormMetaData>();
  const timezone = useTimezone();
  const submitted = useSubmitted();
  const result = useMaybeResult<{ success: boolean; appointment: Appointment }>();
  const error = useError();
  const { url } = useData();
  const formTarget = new URL(url);
  formTarget.hash = "#action-section";

  console.error(error);

  return <AppointmentBody body={result?.success ? undefined : body} />

  function AppointmentBody({ body }: { body?: AppointmentFormMetaData }) {
    return (
        <form name="appointment" action={formTarget.toString()} method="post">
          <div className="flex flex-col">
            <label className={FORM_GROUP_CLASS}>
              <span className="text-gray-700">Appointment title?</span>
              <input
                  className={FORM_CLASS}
                  type="text"
                  name="title"
                  placeholder="Title"
                  defaultValue={body?.title || ""}
              />
            </label>
            <input type="hidden" value="appointment" name="type" />
            {/*<label className={FORM_GROUP_CLASS}>*/}
            {/*  <span className="text-gray-700">What kind of appointment is it?</span>*/}
            {/*  <select name="type" className={FORM_CLASS} defaultValue="appointment">*/}
            {/*    <option value="appointment">Appointment</option>*/}
            {/*  </select>*/}
            {/*</label>*/}
            <label className={FORM_GROUP_CLASS}>
              <span className="text-gray-700">What is a description for it?</span>
              <input
                  className={FORM_CLASS}
                  type="text"
                  name="description"
                  placeholder="Description"
                  defaultValue={body?.description || ""}
              />
            </label>
            <label className={FORM_GROUP_CLASS}>
              <span className="text-gray-700">What timezone is it in?</span>
              <select name="timezone" className={FORM_CLASS} defaultValue={body?.timezone || timezone}>
                <option value="Pacific/Auckland">Pacific/Auckland</option>
              </select>
            </label>
            <label className={FORM_GROUP_CLASS}>
              <span className="text-gray-700">What time does it start? Or started at</span>
              <input
                  className={FORM_CLASS}
                  type="date"
                  name="startAt"
                  placeholder="Start At"
                  defaultValue={body?.startAt || new Date().toISOString()}
              />
            </label>
            <label className={FORM_GROUP_CLASS}>
              <span className="text-gray-700">What time does it end? Or ended at</span>
              <input
                  className={FORM_CLASS}
                  type="date"
                  name="endAt"
                  placeholder="End At"
                  defaultValue={body?.endAt || new Date(Date.now() + DAY_MS).toISOString()}
              />
            </label>

          </div>
          <div id="action-section">
            <button
                type="submit"
                className="bg-sky-500 hover:bg-sky-700 px-4 py-2.5 text-sm leading-5 rounded-md font-semibold text-white"
            >
              Create Appointment
            </button>
          </div>
        </form>
    )
  }
}

export const Component = CreateAppointmentPage;