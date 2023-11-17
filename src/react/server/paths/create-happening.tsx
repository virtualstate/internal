import { FastifyRequest } from "fastify";
import {useError, useInput, useMaybeBody, useMaybeResult, useSubmitted, useTimezone} from "../data";
import {
  FormMetaData,
  getHappeningTree,
  HappeningTree,
  Happening as SingleHappening,
  addFormMeta,
  HappeningData, FormMeta, addHappeningTree
} from "../../../data";
import {ok} from "../../../is";
import {DateTime} from "luxon";
import {fromWebDate} from "./appointment/create";

export const path = "/happening/create";

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


export interface HappeningFormMetaData extends FormMetaData, HappeningData {

}

function assertHappening(value: unknown): asserts value is HappeningFormMetaData {
  ok<HappeningFormMetaData>(value);
  ok(value.type, "Expected type");
  ok(value.title, "Expected title");
  ok(value.timezone, "Expected timezone");
}

export async function submit(request: FastifyRequest) {
  const data = request.body;
  assertHappening(data);

  const meta = await addFormMeta(data);
  const { formMetaId } = meta;

  const { timezone, startAt, startedAt, endAt, endedAt } = data;

  const happeningData: HappeningData = {
    ...data,
    formMetaId,
  };

  if (startAt) {
    happeningData.startAt = fromWebDate(startAt, timezone);
  }
  if (startedAt) {
    happeningData.startedAt = fromWebDate(startedAt, timezone);
  }
  if (endAt) {
    happeningData.endAt = fromWebDate(endAt, timezone);
  }
  if (endedAt) {
    happeningData.endedAt = fromWebDate(endedAt, timezone);
  }

  const happening = await addHappeningTree(happeningData);
  console.log({ happening });

  return { success: true, meta, happening };
}

export function CreateHappeningPage() {
  const body = useMaybeBody<HappeningFormMetaData>();
  const timezone = useTimezone();
  const submitted = useSubmitted();
  const result = useMaybeResult<{ success: boolean; meta: FormMeta, happening: HappeningTree }>();
  const error = useError();

  console.error(error);

  return <HappeningBody body={result?.success ? undefined : body} />

  function HappeningBody({ body }: { body?: HappeningFormMetaData }) {
    return (
        <form name="happening" action="/happening/create#action-section" method="post">
          <div className="flex flex-col">
            <label className={FORM_GROUP_CLASS}>
              <span className="text-gray-700">Whats happening?</span>
              <input
                  className={FORM_CLASS}
                  type="text"
                  name="title"
                  placeholder="Title"
                  defaultValue={body?.title || ""}
              />
            </label>
            <label className={FORM_GROUP_CLASS}>
              <span className="text-gray-700">What kind of thing is it?</span>
              <select name="type" className={FORM_CLASS} defaultValue="event">
                {/*
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
                */}
                <option value="event">Event</option>
                <option value="appointment">Appointment</option>
                <option value="activity">Activity</option>
                <option value="report">Report</option>
                <option value="availability">Availability</option>
                <option value="bill">Bill</option>
                <option value="intent">Intent</option>
                <option value="swap">Swap</option>
                <option value="ticket">Ticket</option>
                <option value="poll">Poll</option>
              </select>
            </label>
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
              <span className="text-gray-700">What time does it end? Or ended ats</span>
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
              Submit Happening
            </button>
          </div>
        </form>
    )
  }
}

export const Component = CreateHappeningPage;