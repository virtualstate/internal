import { useData } from "../data";
import {DISCORD_CLIENT_ID} from "../../../listen/auth/discord";
import {REDDIT_CLIENT_ID} from "../../../listen/auth/reddit";
import {AUTHSIGNAL_CHALLENGE_API_URL, AUTHSIGNAL_TENANT, AUTHSIGNAL_WEBAUTHN} from "../../../authentication/authsignal";

export const path = "/login";
export const anonymous = true;

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

const {
  ALLOW_ANONYMOUS_USER
} = process.env;

export function Login() {
  const { isUnauthenticated, url } = useData();
  if (!isUnauthenticated) {
    return <p>You're already logged in!</p>;
  }
  const state = new URL(url).searchParams.get("state");
  const params = new URLSearchParams();
  if (state) {
    params.set("state", state);
  }
  const stateUrlSuffix = state ? `?${state.toString()}` : ""
  const anonymousParams = new URLSearchParams(params);
  anonymousParams.set("redirect", "/home");
  return (
    <div>
      <form
        id="login-authsignal"
        name="login-authsignal"
        action="/api/authentication/authsignal/redirect"
        method="post"
      >
        {
          AUTHSIGNAL_WEBAUTHN ? (
            <>
              <meta name="authsignal-tenant-id" content={AUTHSIGNAL_TENANT} />
              <meta name="authsignal-region" content={AUTHSIGNAL_CHALLENGE_API_URL} />
              <meta name="authsignal-track-url" content="/api/authentication/authsignal/track" />
            </>
          ) : undefined
        }
        {
          state ? <input type="hidden" name="state" value={state} /> : undefined
        }
        <div className="flex flex-col">
          <label className={FORM_GROUP_CLASS}>
            <span className="text-gray-700">Email Address</span>
            <input
              className={FORM_CLASS}
              type="email"
              name="email"
              defaultValue=""
              placeholder="Email Address"
            />
          </label>
        </div>
        <div id="action-section">
          <button
            type="submit"
            className="bg-sky-500 hover:bg-sky-700 px-4 py-2.5 text-sm leading-5 rounded-md font-semibold text-white mr-2"
          >
            Continue with Email
          </button>
        </div>
      </form>
      {(DISCORD_CLIENT_ID || REDDIT_CLIENT_ID || ALLOW_ANONYMOUS_USER) ? <div><br/>OR<br/><br/></div> : undefined}
      {
        DISCORD_CLIENT_ID ? (
            <>
              <a
                  href={`/api/authentication/discord/redirect${stateUrlSuffix}`}
                  className="text-blue-600 hover:bg-white underline hover:underline-offset-2"
              >
                Continue with Discord
              </a>
              <br />
            </>
        ) : undefined
      }
      {
        REDDIT_CLIENT_ID ? (
            <>
              <a
                  href={`/api/authentication/reddit/redirect${stateUrlSuffix}`}
                  className="text-blue-600 hover:bg-white underline hover:underline-offset-2"
              >
                Continue with Reddit
              </a>
              <br />
            </>
        ) : undefined
      }
      {
        ALLOW_ANONYMOUS_USER ? (
            <>
              <a
                href={`/api/authentication/anonymous?${anonymousParams.toString()}`}
                  className="text-blue-600 hover:bg-white underline hover:underline-offset-2"
              >
                Continue as Anonymous User
              </a>
              <br />
            </>
        ) : undefined
      }
    </div>
  );
}

export const Component = Login;