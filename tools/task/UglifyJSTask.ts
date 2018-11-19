import * as gulp from "gulp";
import * as uglify from "gulp-uglify";
import { Logger as console } from "../libs/Logger";
import { HelperTask } from "./HelperTask";

export class UglifyJSTask {
    public run() {
        console.log("->", "UglifyJSTask", HelperTask.taking());
        return new Promise((resolve, reject) => {
            gulp.task("UglifyJSTask", () => {
                return gulp.src("build/**/*.js")
                    .pipe(uglify())
                    .pipe(gulp.dest("build"))
                    .on("end", () => {
                        console.info("UglifyJSTask.end");
                        resolve();
                    }).on("error", (error) => {
                        console.info("UglifyJSTask.error");
                        reject(error);
                    });
            });
            gulp.start("UglifyJSTask");
        });
    }
}
export default UglifyJSTask;
