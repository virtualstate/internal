import {getConfig, setConfig} from "../config";
import {views as defaultViews} from "../react/server/paths";
import {View} from "./types";

export function getViews(): View[] {
    const config = getConfig();
    const { views = [] } = config;

    const includedPaths = views.map(view => view.path);
    const baseViews = defaultViews
        .filter(view => !includedPaths.includes(view.path));

    if (!baseViews.length) return views;

    const allViews = [...baseViews, ...views];

    // Next time getConfig is called, no base views will be included
    setConfig({ ...config, views: allViews });

    return [...baseViews, ...views];
}

export function getView(path: string) {
    const views = getViews();
    return views.find(view => view.path === path);
}