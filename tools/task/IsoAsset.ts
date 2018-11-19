import * as gulp from "gulp";
import * as plumber from "gulp-plumber";
import * as Path from "path";
import ConfigHelper from "../libs/ConfigHelper";
import { Logger as console } from "../libs/Logger";
import { HelperTask } from "./HelperTask";
export class IsoAsset {
    public taskName = "IsoAsset";
    public cdn = ConfigHelper.get("package", "cdn");
    public watchModel: boolean = false;
    private rootPath: string = "./";
    private count = 1;
    private src = "";

    constructor(src?: string, taskName?: string) {
        const ext = "(js|css|txt|ico|ttf|gif|png|jpg|swf|woff|woff2|webp|mp4|avi|flv)";
        if (src) {
            this.src = src;
        } else {
            this.src = Path.resolve(`./src/iso/**/*.+${ext}`);
        }
        if (taskName) {
            this.taskName = taskName;
        }
    }

    public setCDN(cdn: string) {
        this.cdn = cdn;
        return this;
    }

    public setWatchModel(watchModel: boolean) {
        this.watchModel = watchModel;
        return this;
    }

    public async run() {
        return new Promise((resolve, reject) => {
            console.log("->", "IsoAsset", HelperTask.taking());
            gulp.task("IsoAsset", () => {
                return gulp.src(this.src)
                    .pipe(plumber())
                    .pipe(gulp.dest(`./build/iso/${this.cdn}`))
                    .on("end", () => {
                        console.warn(this.taskName, "done", this.count++);
                    });
            });
            if (this.watchModel) {
                const watcher = gulp.watch(this.src, ["IsoAsset"]);
                watcher.on("change", (event) => {
                    console.info("IsoAsset", "file " + event.path + " was " + event.type + ", running tasks...");
                });
            }
            gulp.start("IsoAsset", (error) => {
                if (error) {
                    reject(error);
                }
                resolve();
            });
        });
    }
}
export default IsoAsset;
