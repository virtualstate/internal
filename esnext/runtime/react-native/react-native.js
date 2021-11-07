import { Environment as EnvironmentTemplate } from "../../environment/environment.js";
let instance = undefined;
let instances = 0;
export class Environment extends EnvironmentTemplate {
    constructor(name = "react-native") {
        super(name);
        if (!instance) {
            instance = this;
        }
        instances += 1;
    }
    static getEnvironment() {
        if (instances > 1) {
            console.log("Multiple environments created for this react-native process");
        }
        return instance;
    }
}
