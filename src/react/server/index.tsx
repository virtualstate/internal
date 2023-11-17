import { ReactData, DataProvider } from "./data";
import { getOrigin } from "../../listen/config";
import { UnauthenticatedLayout, Layout, LayoutProps } from "./layout";
import {View} from "../../view";

export * from "./data";
export * from "./paths";
export * from "./layout";

export interface OpenNetworkServerProps extends ReactData {
  url: string;
  view: View;
}

export default function OpenNetworkServer(options: OpenNetworkServerProps) {
  const { pathname } = new URL(options.url, getOrigin());
  const { view: { Component } } = options;

  if (!Component) {
    return <div>Could not find {pathname}</div>;
  }

  let children = <Component />;

  if (!options.isFragment) {
    const layoutProps: LayoutProps = {
      url: options.url,
    };
    if (options.isUnauthenticated) {
      children = <UnauthenticatedLayout {...layoutProps}>{children}</UnauthenticatedLayout>;
    } else {
      children = <Layout {...layoutProps}>{children}</Layout>;
    }
  }

  return <DataProvider value={options}>{children}</DataProvider>;
}
