import * as cssnano from "cssnano";
// import * as  cssnano from 'gulp-cssnano';
import * as gulp from "gulp";
import * as gulpless from "gulp-less";
import * as plumber from "gulp-plumber";
import * as postcss from "gulp-postcss";
import * as replace from "gulp-replace";
import * as sourcemaps from "gulp-sourcemaps";
import * as watchLess from "gulp-watch-less";
import * as inlineURLSPlugin from "less-plugin-inline-urls";
import * as Path from "path";
import * as precss from "precss";
import { ConfigHelper } from "../libs/ConfigHelper";
import { Logger as console } from "../libs/Logger";
import { HelperTask } from "./HelperTask";

export class StylePack {
    public cdn = ConfigHelper.get("package", "cdn");
    public watchModel: boolean = false;
    public templateModel: boolean = false;
    private rootPath: string = "./";
    private count = 1;
    private srcPath = "./src/client/style-router";
    private taskName = "StylePack";
    private targetDir = "style";

    public setWatchModel(watchModel: boolean) {
        this.watchModel = watchModel;
        return this;
    }

    public setTemplateModel(templateModel: boolean) {
        this.templateModel = templateModel;
        return this;
    }

    public setSrcPath(srcPath) {
        this.srcPath = srcPath;
        return this;
    }

    public setTaskName(taskName) {
        this.taskName = taskName;
        return this;
    }

    public setTargetDir(targetDir) {
        this.targetDir = targetDir;
        return this;
    }

    public async run() {
        return new Promise((resolve, reject) => {
            console.log("->", this.taskName, HelperTask.taking());
            let ieCompat = ConfigHelper.get("config/configure", "clientPack.style.ieCompat", true);
            const base64 = ConfigHelper.get("config/configure", "clientPack.style.base64", true);
            if (base64 === false) {
                ieCompat = undefined;
            }
            const src = this.srcPath + "/**/*.less";
            gulp.task("StylePack", () => {
                const sourcePaths = [src];
                let source = gulp.src(sourcePaths).pipe(plumber({
                    errorHandler: (error) => {
                        console.warn(error);
                        if (this.watchModel === false) {
                            throw error;
                        }
                        return true;
                    },
                }));
                source = source.pipe(sourcemaps.init());
                const less = {
                    paths: [
                        Path.resolve(`${this.rootPath}/src/client/style`),
                        Path.resolve(`${this.rootPath}/src/client`),
                    ],
                    plugins: [],
                    relativeUrls: true,
                };
                if (base64) {
                    less["ieCompat"] = ieCompat;
                    less.paths.push(Path.resolve(`${this.rootPath}/src/client/images`));
                    less.plugins.push(inlineURLSPlugin);
                }
                console.info("lessOption", JSON.stringify(less));
                source = source.pipe(gulpless(less));
                source = source.pipe(postcss([require("autoprefixer")({
                    browsers: [
                        "Android 2.3",
                        "Android >= 4",
                        "Chrome >= 20",
                        "Firefox >= 24",
                        "Explorer >= 8",
                        "iOS >= 6",
                        "Opera >= 12",
                        "Safari >= 6",
                    ],
                }), precss, cssnano({
                    zindex: false,
                })]));
                // source = source.pipe(cssnano({
                //     zindex: false,
                // }));
                if (this.watchModel) {
                    source = source.pipe(sourcemaps.write("./"));
                }
                if (this.templateModel) {
                    console.info(this.taskName + " > templateModel");
                    // source = source.pipe(sourcemaps.write("./"));
                    source = source.pipe(gulp.dest(`${this.rootPath}/build/client/${this.targetDir}`));
                } else {
                    // source = source.pipe(replace(/images/g, `${this.cdn}/images`));
                    source = source.pipe(gulp.dest(`${this.rootPath}/build/client/${this.cdn}/${this.targetDir}`));
                }
                source.on("end", (event) => {
                    console.log(this.taskName + " > done", this.count++);
                });
                return source;
            });
            if (this.watchModel) {
                const watcher = watchLess(this.srcPath + "/**/*.less", (events) => {
                    console.log("开始编译less");
                    gulp.start("StylePack");
                });
            }
            gulp.start("StylePack", (error) => {
                if (error) {
                    reject(error);
                }
                resolve();
            });
        });
    }
}
export default StylePack;
