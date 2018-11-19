import { execSync } from "child_process";
import * as Path from "path";

export class ReleaseTask {
    public buildPath = Path.normalize("./build");

    public start() {
        console.log("ReleaseTask > start", this);
        const output = execSync("npm install --production", {
            cwd: this.buildPath,
        });
        console.log(output.toString());
    }
}
export default ReleaseTask;
