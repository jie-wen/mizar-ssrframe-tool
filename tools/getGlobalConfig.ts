import * as path from "path";
import { ConfigHelper } from "./libs/ConfigHelper";

export default () => {
    const rootOutput = "build";
    const cdnPath = ConfigHelper.get("package", "cdn");
    return {
        rootOutput,
        cdnPath,
        clientOutput: path.resolve(`${rootOutput}/client/${cdnPath}`),
    };
};
