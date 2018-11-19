import * as gulp from "gulp";
import * as  html2jsx from "gulp-html2jsx";
import * as  htmlhint from "gulp-htmlhint";
import * as  htmlmin from "gulp-htmlmin";
import * as  gulpIncludeTemplate from "gulp-include-template";
import * as plumber from "gulp-plumber";
/**
 * a.编译html
 * b.编译jsx
 */

export default class HTMLComplie {
    public jsx = true;
    public src = "./src/client/**/*.html";
    public dest = `./build/client`;
    private watchModel: boolean = true;
    private rootPath: string = "./";

    public async start() {
        await this.run();
    }
    public async run() {
        await this.complieHTML();
        if (this.jsx) {
            await this.complieJSX();
        }
    }
    public async complieHTML() {
        return new Promise((resolve) => {
            gulp.task("develop-html", () => {
                let source = gulp.src(this.src);
                source = source.pipe(plumber());
                source = source.pipe(gulpIncludeTemplate());
                source = source.pipe(htmlhint({
                    "doctype-first": false,
                }));
                source = source.pipe(htmlhint.reporter());
                source = source.pipe(htmlmin({
                    collapseWhitespace: true,
                    minifyCSS: true,
                    minifyJS: true,
                    removeComments: false,
                    useShortDoctype: true,
                }));
                source = source.pipe(gulp.dest(this.dest));
                source = source.on("end", () => {
                    console.log("HTMLComplie.complieHTML.end");
                    resolve();
                });
                return source;
            });
            gulp.start("develop-html");
            if (this.watchModel) {
                gulp.watch(this.src, ["develop-html"]);
            }

        });
    }
    public async complieJSX() {
        return new Promise((resolve) => {
            gulp.task("develop-jsx", () => {
                let source = gulp.src(this.src);
                source = source.pipe(plumber());
                source = source.pipe(gulpIncludeTemplate());
                source = source.pipe(htmlhint({
                    "doctype-first": false,
                }));
                source = source.pipe(htmlhint.reporter());
                source = source.pipe(html2jsx());
                source = source.pipe(gulp.dest(this.dest));
                source = source.on("end", () => {
                    console.log("HTMLComplie.complieJSX.end");
                    resolve();
                });
                return source;
            });
            gulp.start("develop-jsx");
            if (this.watchModel) {
                const watcher = gulp.watch(this.src, ["develop-jsx"]);
                watcher.on("change", (event) => {
                    console.log("File " + event.path + " was " + event.type + ", running tasks...");
                });
            }
        });
    }
}
