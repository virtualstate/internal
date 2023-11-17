import {View} from "../../../view";

import {
  SettingsView,
  HomeView,
  IndexView,
  FeedbackView,
  LogoutView,
  LoginView,
  ErrorsView,
  invite,
  userCredential,
  durableEvent
} from "./views";

export * as namedViews from "./views";

export const views: View[] = [
  SettingsView,
  HomeView,
  IndexView,
  FeedbackView,
  LoginView,
  LogoutView,
  ErrorsView,
  invite.create,
  invite.accept,
  userCredential.list,
  durableEvent.create,
  durableEvent.list,
];

export * from "./types";