import { FastifyReply, FastifyRequest } from "fastify";
import { renderToStaticMarkup } from "react-dom/server";
import OpenNetworkServer from "../react/server";
import { getOrigin } from "../listen";
import {getMaybeAuthenticationState, getMaybeUser, isUnauthenticated} from "../authentication";
import { isHTMLResponse } from "../listen";
import {getConfig} from "../config";
import {getView} from "./views";

export function errorHandler(
  error: Error,
  request: FastifyRequest,
  response: FastifyReply
) {
  if (!isHTMLResponse(request)) {
    return response.send(error);
  }

  const { pathname } = new URL(request.url, getOrigin());
  const isFragment = pathname.endsWith("/fragment");
  const anonymous = isUnauthenticated();
  const user = getMaybeUser();
  const { DEFAULT_TIMEZONE = "Pacific/Auckland" } = process.env;
  const origin = getOrigin();

  const html = renderToStaticMarkup(
    <OpenNetworkServer
      view={getView("/error")}
      isFragment={isFragment}
      isUnauthenticated={anonymous}
      url={new URL(request.url, origin).toString()}
      origin={origin}
      error={error}
      organisations={[]}
      partners={[]}
      user={user}
      timezone={DEFAULT_TIMEZONE}
      config={getConfig()}
      authenticationState={getMaybeAuthenticationState()}
    />
  );

  response.header("Cache-Control", "No-Store");
  response.header("Content-Type", "text/html; charset=utf-8");
  response.header("Cross-Origin-Embedder-Policy", "unsafe-none");
  response.send(html);
}
