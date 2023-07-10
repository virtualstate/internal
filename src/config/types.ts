import type {FastifyPluginAsync} from "fastify";
import type {ReactOrderConfig} from "../react/server/paths/order/types";
import type {ViewConfig} from "../view";
import type {AuthenticationRoleConfig} from "../data";
import type {ComponentConfig} from "../react/server/paths/config";

export interface LogisticsConfig {
    routes?: FastifyPluginAsync
}

export interface Config extends LogisticsConfig, ReactOrderConfig, ViewConfig, Partial<AuthenticationRoleConfig>, ComponentConfig {

}
