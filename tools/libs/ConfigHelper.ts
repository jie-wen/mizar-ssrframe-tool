import * as fs from "fs-extra";
import * as JSONCParser from "jsonc-parser";
import * as path from "path";
import { argv } from "yargs";
import { Logger as console } from "../libs/Logger";

export class ConfigHelper {
    public static store: any = {};

    public static set(name, node, value) {
        ConfigHelper.store[`${name}-${node}`] = value;
    }
    public static get(name: string, node: string, defaultValue = null) {
        const key = `${name}.json->${node}`;
        if (ConfigHelper.store[`${name}-${node}`]) {
            console.log("read in store", key + "->" + JSON.stringify(ConfigHelper.store[`${name}-${node}`]));
            return ConfigHelper.store[`${name}-${node}`];
        }
        const configPath = path.resolve(`./build/${name}.json`);
        try {
            const content = fs.readFileSync(configPath, "utf8");
            let store = JSONCParser.parse(content);
            const info = node.split(".");
            console.log("ConfigHelper.get.info", info);
            const cur = null;
            info.map((item) => {
                if (typeof store[item] !== "undefined" && store !== null) {
                    store = store[item];
                } else {
                    store = null;
                }
            });
            console.log("ConfigHelper.get.store", store);
            if (store !== null) {
                defaultValue = store;
            }

        } catch (error) {
            console.log("ConfigHelper.get.CONFIG_NOT_FOUND.", `${name}-${node}`, error.message);
        }
        if (defaultValue === null) {
            const msg = `Config > 未能获取到缺省和默认配置,${name},${node}。`;
            throw new Error(msg);
        }
        console.log("ConfigHelper.get", key + "->" + JSON.stringify(defaultValue));
        ConfigHelper.store[`${name}-${node}`] = defaultValue;
        return defaultValue;
    }
    public static getPackageVersion() {
        let ver = 0;
        // console.log(argv);
        if (argv.version && argv.version !== true) {
            ver = argv.version;
            // if (isNaN(ver)) {
            //     ver = 0;
            // }
        }
        const packageJSON = fs.readJSONSync(path.resolve("./package.json"));
        const version = packageJSON.version.split(".");
        version[2] = ver;
        return version.join(".");
    }
}
export default ConfigHelper;
