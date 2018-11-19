import * as gulp from "gulp";
// import * as htmlInline from "gulp-html-inline";
import * as htmlminify from "gulp-html-minify";
import * as gulpif from "gulp-if";
import * as plumber from "gulp-plumber";
import * as Path from "path";
import ConfigHelper from "../libs/ConfigHelper";
import { Logger as console } from "../libs/Logger";
import { HelperTask } from "./HelperTask";

export class ServerAsset {
    public taskName = "ServerAsset";
    public watchModel: boolean = false;
    private rootPath: string = Path.resolve("./");
    private count = 1;
    public setWatchModel(watchModel: boolean) {
        this.watchModel = watchModel;
        return this;
    }
    public async run() {
        return new Promise((resolve, reject) => {
            console.log("->", this.taskName, HelperTask.taking());
            const ext = "(ejs)";
            const src = Path.resolve(`${this.rootPath}/src/server/**/*` + `.+${ext}`);
            gulp.task("ServerAsset", () => {
                return gulp.src(src)
                    .pipe(plumber())
                    // .pipe(gulpif("*.ejs", htmlInline({ minifyCss: true, minifyJs: true })))
                    .pipe(gulpif("*.ejs", htmlminify()))
                    .pipe(gulp.dest(`./build`))
                    .pipe(gulp.dest(`./build/server`))
                    .on("end", () => {
                        console.warn(this.taskName, "done", this.count++);
                        // resolve();
                    });
            });

            if (this.watchModel) {
                const watcher = gulp.watch(src, ["ServerAsset"]);
                watcher.on("change", (event) => {
                    console.warn("File " + event.path + " was " + event.type + ", running tasks...");
                });
            }
            gulp.start("ServerAsset", (error) => {
                if (error) {
                    reject(error);
                }
                resolve();
            });
        });
    }
}
export default ServerAsset;
