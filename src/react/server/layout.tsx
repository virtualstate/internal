import {FunctionComponent, PropsWithChildren, ReactElement, useMemo} from "react";
import { description, namespace, project } from "../../package";
import { getOrigin } from "../../listen";
import {useConfig, useData, useIsTrusted, useQuerySearch} from "./data";
import { importmapPath, name } from "../../package";
import { readFile } from "node:fs/promises";
import {ShoppingBagIcon} from "../client/components/icons";

const {
  IS_LOCAL,
  DISABLE_ALPHA_WARNING_BANNER
} = process.env;

export interface LayoutConfig {
  Head?: FunctionComponent
  Foot?: FunctionComponent
}

export const importMapJSON = await readFile(importmapPath, "utf-8");

export interface LayoutProps {
  title?: string;
  url: string;
}

interface MenuItem {
  path: string;
  name: string;
}

interface UserMenuItem extends MenuItem {
  icon: ReactElement;
  trusted?: boolean;
}

const publicItems: MenuItem[] = [
  {
    path: "/",
    name: "Home",
  },
  {
    path: "/feedback",
    name: "Feedback",
  },
];

const MENU_ICON_CLASS = "h-6 w-6 shrink-0 text-indigo-200 group-hover:text-white";

const items: UserMenuItem[] = [
  {
    path: "/home",
    name: "Home",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={MENU_ICON_CLASS}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819"
        />
      </svg>
    ),
  },
  {
    path: "/orders/history",
    name: "Orders",
    icon: (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={MENU_ICON_CLASS}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>

    ),
  },
  {
    path: "/products",
    name: "Products",
    icon: (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={MENU_ICON_CLASS}
        >
          <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
          />
        </svg>
    ),
  },
  {
    path: "/services",
    name: "Services",
    icon: (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={MENU_ICON_CLASS}
        >
          <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
          />
        </svg>
    ),
  },
  {
    path: "/appointments",
    name: "Appointments",
    icon: (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={MENU_ICON_CLASS}
        >
          <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
          />
        </svg>
    ),
  },
  {
    path: "/logout",
    name: "Logout",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={MENU_ICON_CLASS}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
        />
      </svg>
    ),
  },
];

function Logo() {
  return (
    <div className="flex flex-row align-start items-center">
      <img
        role="presentation"
        src={`/${name}/public/example-3.svg`}
        alt="Brand Image"
        className="h-8 w-auto fill-white"
        title="Open Network Happening"
      />
    </div>
  );
}

const SETTINGS_ICON = (
  <svg
    className="h-6 w-6 shrink-0 text-indigo-200 group-hover:text-white"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

export function BaseLayout({
  children,
  title,
}: PropsWithChildren<LayoutProps>) {
  const { Head, Foot } = useConfig();
  const script = `
    const { client } = await import("/${name}/client/pages/index.js");
    try {
        await client();
    } catch (error) {
       console.error(error);
    }
    `;
  return (
    <html lang="en" className="h-full bg-white">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title || project}</title>
        <meta name="description" content={description} />
        <meta name="author" content={namespace} />
        <link href={`/${name}/server.css`} rel="stylesheet" />
        <script type="importmap" dangerouslySetInnerHTML={{ __html: importMapJSON }} />
        {Head ? <Head /> : undefined}
      </head>
      <body className="h-full">
        {
          !IS_LOCAL && !DISABLE_ALPHA_WARNING_BANNER ? (
              <div className="lg:pl-72 flex items-center gap-x-6 bg-gray-900 px-6 py-2.5 sm:px-3.5 sm:before:flex-1 sm:after:flex-1 justify-center">
                <p className="text-sm leading-6 text-white">
              <span className="flex items-center flex-row justify-center">
                <strong className="font-semibold">
                  This software is still being refined
                </strong>
                &nbsp;&nbsp;
                <svg
                    viewBox="0 0 2 2"
                    className="hidden lg:block mx-2 inline h-0.5 w-0.5 fill-current"
                    aria-hidden="true"
                >
                  <circle cx="1" cy="1" r="1" />
                </svg>
                &nbsp;&nbsp;
                <span>
                  Data displayed is not currently verified or checked, and will be
                  removed without further notice.
                  <br />
                  Data is intended to be used only for user experience testing.
                </span>
              </span>
                </p>
              </div>
          ) : undefined
        }

        {children}
        <script type="module" dangerouslySetInnerHTML={{ __html: script }} />
        {Foot ? <Foot /> : undefined}
      </body>
    </html>
  );
}

export function UnauthenticatedLayout(props: PropsWithChildren<LayoutProps>) {
  const { children } = props;
  const { url } = useData();
  const { pathname } = new URL(url, getOrigin());
  return (
    <BaseLayout {...props}>
      <div className="min-h-full">
        <nav className="bg-indigo-600">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Logo />
                </div>
                <div className="flex flex-row">
                  {publicItems.map(({ path, name }, index) => {
                    const isPath =
                      path === "/"
                        ? pathname === path || pathname === "/home"
                        : pathname.startsWith(path);
                    return (
                      <div
                        className="ml-10 flex items-baseline space-x-4"
                        key={index}
                      >
                        <a
                          href={path}
                          className={`${
                            isPath ? "bg-indigo-700" : ""
                          } text-white hover:bg-indigo-500 hover:bg-opacity-75 rounded-md px-3 py-2 text-sm font-medium`}
                        >
                          {name}
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main>
          <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </BaseLayout>
  );
}

export function Layout(props: PropsWithChildren<LayoutProps>) {
  const { children, url } = props;
  const { pathname } = new URL(url, getOrigin());
  const search = useQuerySearch();
  const isTrusted = useIsTrusted();
  const { order } = useData();
  const pendingOrder = order?.status === "pending" ? order : undefined;
  const inOrder = pendingOrder?.products?.reduce(
      (sum, value) => sum + (value.quantity ?? 1),
      0
  ) ?? 0;
  const userMenuItems = useMemo(() => {
    const filtered = items.filter(({ trusted }) => !trusted || isTrusted);
    if (inOrder) {
      const last = filtered.pop();
      filtered.push({
        icon: <ShoppingBagIcon className={MENU_ICON_CLASS} />,
        path: "/order/checkout/review",
        name: `Checkout ${inOrder}${inOrder > 1 ? " Items" : ""}`
      });
      filtered.push(last);
    }
    return filtered;
  }, [items, inOrder]);
  return (
    <BaseLayout {...props}>
      <div>
        <noscript className="lg:hidden">
          <ul role="list" className="-mx-2 space-y-1 list-none dynamic-sidebar-nojs">
            {userMenuItems.map(({ path, name, icon }, index) => (
              <li key={index}>
                <a
                  href={path}
                  className="text-blue-600 hover:bg-white underline hover:underline-offset-2 flex flex-row align-center justify-left p-4"
                >
                  {icon}
                  <span className="px-4">{name}</span>
                </a>
              </li>
            ))}
            <li>
              <a
                href="/settings"
                className="text-blue-600 hover:bg-white underline hover:underline-offset-2 flex flex-row align-center justify-left p-4"
              >
                {SETTINGS_ICON}
                <span className="px-4">Settings</span>
              </a>
            </li>
          </ul>
          <hr />
        </noscript>
        {/* Off-canvas menu for mobile, show/hide based on off-canvas menu state. */}
        <div
          className="hidden sidebar lg:hidden dynamic-sidebar-mobile"
          role="dialog"
          aria-modal="true"
        >
          {/*
                      Off-canvas menu backdrop, show/hide based on off-canvas menu state.
                
                      Entering: "transition-opacity ease-linear duration-300"
                        From: "opacity-0"
                        To: "opacity-100"
                      Leaving: "transition-opacity ease-linear duration-300"
                        From: "opacity-100"
                        To: "opacity-0"
                    */}
          <div className="fixed inset-0 bg-gray-900/80 sidebar-backdrop" />

          <div className="fixed inset-0 flex">
            {/*
                          Off-canvas menu, show/hide based on off-canvas menu state.
                  
                          Entering: "transition ease-in-out duration-300 transform"
                            From: "-translate-x-full"
                            To: "translate-x-0"
                          Leaving: "transition ease-in-out duration-300 transform"
                            From: "translate-x-0"
                            To: "-translate-x-full"
                        */}
            <div className="relative mr-16 flex w-full max-w-xs flex-1 sidebar-menu">
              {/*
                              Close button, show/hide based on off-canvas menu state.
                    
                              Entering: "ease-in-out duration-300"
                                From: "opacity-0"
                                To: "opacity-100"
                              Leaving: "ease-in-out duration-300"
                                From: "opacity-100"
                                To: "opacity-0"
                            */}
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button
                  type="button"
                  className="sidebar-close-button -m-2.5 p-2.5"
                >
                  <span className="sr-only">Close sidebar</span>
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Sidebar component, swap this element with another sidebar if you like */}
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-indigo-600 px-6 pb-4 sidebar-contents">
                <div className="flex h-16 shrink-0 items-center">
                  <Logo />
                </div>
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {userMenuItems.map(({ path, name, icon }, index) => (
                          <li key={index}>
                            <a
                              href={path}
                              className={`${
                                pathname.startsWith(path)
                                  ? "bg-indigo-700 text-white"
                                  : "text-indigo-200 hover:text-white hover:bg-indigo-700"
                              } group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold`}
                            >
                              {icon}
                              {name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </li>
                    <li className="mt-auto">
                      <a
                        href="/settings"
                        className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-indigo-200 hover:bg-indigo-700 hover:text-white"
                      >
                        {SETTINGS_ICON}
                        Settings
                      </a>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Static sidebar for desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col dynamic-sidebar-desktop">
          {/* Sidebar component, swap this element with another sidebar if you like */}
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-indigo-600 px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center">
              <Logo />
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {userMenuItems.map(({ path, name, icon }, index) => (
                      <li key={index}>
                        <a
                          href={path}
                          className={`${
                            pathname.startsWith(path)
                              ? "bg-indigo-700 text-white"
                              : "text-indigo-200 hover:text-white hover:bg-indigo-700"
                          } group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold`}
                        >
                          {icon}
                          {name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
                <li className="mt-auto">
                  <a
                    href="/settings"
                    className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-indigo-200 hover:bg-indigo-700 hover:text-white"
                  >
                    {SETTINGS_ICON}
                    Settings
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="lg:pl-72">
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <button
              type="button"
              className="hidden script-visible sidebar-open-button -m-2.5 p-2.5 text-gray-700 lg:hidden"
            >
              <span className="sr-only">Open sidebar</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>

            {/* Separator */}
            <div
              className="h-6 w-px bg-gray-900/10 lg:hidden hidden script-visible"
              aria-hidden="true"
            ></div>

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <form
                className="relative flex flex-1"
                action="/products"
                method="GET"
              >
                <label htmlFor="search-field" className="sr-only">
                  Search Products
                </label>
                <svg
                  className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clipRule="evenodd"
                  />
                </svg>
                <input
                  id="search-field"
                  className="block h-full w-full border-0 py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                  placeholder="Search products..."
                  type="search"
                  name="search"
                  defaultValue={search}
                />
              </form>
            </div>
          </div>

          <main className="py-10">
            <div className="px-4 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </BaseLayout>
  );
}
