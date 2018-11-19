import * as Path from "path";
import * as webpack from "webpack";
import { HelperTask } from "../task/HelperTask";

export class WebpackTaskBase {
    public taskName = "WebpackTaskBase";
    public watchModel = false;
    public count = 1;
    public helperTask = new HelperTask();
    public projectRoot = Path.resolve(".");

    public setTaskName(taskName: string) {
        this.taskName = taskName;
    }

    public setWatch(watchModel) {
        this.watchModel = watchModel;
        return this;
    }

    protected async webpack(config) {
        return new Promise(async (resolve, reject) => {
            const compiler = webpack(config);
            if (this.watchModel) {
                compiler.watch({}, async (error, stats) => {
                    await this.done(error, stats);
                    resolve();
                });
            } else {
                compiler.run(async (error, stats) => {
                    if (error) {
                        return reject(error);
                    }
                    try {
                        await this.done(error, stats);
                    } catch (error) {
                        return reject(error);
                    }
                    resolve();
                });
            }
        });
    }
    protected async doneCallback() {
        console.log(this.taskName, "doneCallback");
    }
    protected minifyCode() {
        const minfiyOption = {
            comments: false,
            compress: {
                drop_console: false,
            },
        };
        return new webpack.optimize.UglifyJsPlugin(minfiyOption);
    }
    protected async done(webpackSelfError, stats) {
        if (webpackSelfError) {
            console.error(this.taskName, "> error", webpackSelfError.stack || webpackSelfError);
            if (webpackSelfError.details) {
                console.error(webpackSelfError.details);
            }
            this.helperTask.sendMessage(this.taskName, "webpack运行有错" + this.count);
            return;
        }
        const info = stats.toJson();
        const errors = info.errors;
        console.warn("共有错误数：", errors.length);
        const warnings = info.warnings;
        console.warn("共有警告数：", warnings.length);

        if (stats.hasErrors()) {
            // 有错误
            errors.forEach((error) => {
                console.error(error);
            });
            const firstError = errors[0];
            this.helperTask.sendMessage("代码有错误", firstError);
            // 非watch模式直接抛异常
            if (this.watchModel === false) {
                const message = this.taskName + ".fail";
                throw new Error(message);
            }
        }

        if (stats.hasWarnings()) {
            // 有警告
            if (this.watchModel === true) {
                warnings.forEach((warning) => {
                    console.warn(warning);
                });
            }
            const firstWarning = warnings[0];
            this.helperTask.sendMessage("代码有警告 ", firstWarning);
        }

        // 完成
        console.warn(this.taskName + ".done", this.count++);
        await this.doneCallback();
        this.helperTask.sendMessage(this.taskName, "编译结束:" + this.count);
    }
}
export default WebpackTaskBase;
