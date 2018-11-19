import * as gulp from "gulp";
import * as jsonmin from "gulp-jsonmin";
import * as stripJsonComments from "gulp-strip-json-comments";
import { Logger as console } from "../libs/Logger";
import { HelperTask } from "./HelperTask";

export class ConfigTask {
    public async run() {
        return new Promise((resolve, reject) => {
            const helperTask = new HelperTask();
            console.log("->", "ConfigTask", HelperTask.taking());
            gulp.task("ConfigTask", () => {
                return gulp.src("config/**/*.json")
                    .on("end", () => {
                        console.info("ConfigTask.done");
                        // resolve();
                    }).on("error", (error) => {
                        console.error("ConfigTask.error", error.message);
                        helperTask.sendMessage("ConfigTask-Error", error.message);
                    })
                    .pipe(stripJsonComments())
                    .pipe(jsonmin())
                    .pipe(gulp.dest("build/config"));
            });
            gulp.start("ConfigTask", (error) => {
                if (error) {
                    reject(error);
                }
                resolve();
            });
        });
    }
}
export default ConfigTask;
