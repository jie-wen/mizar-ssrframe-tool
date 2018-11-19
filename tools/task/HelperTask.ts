import { execSync } from "child_process";
import * as log4js from "log4js";
import * as Notifier from "node-notifier";
import { argv } from "yargs";
import { CleanTask } from "./CleanTask";

export class HelperTask {
    public static taking() {
        const now = new Date();
        const taking = now.getTime() - HelperTask.prevDateTime.getTime();
        HelperTask.prevDateTime = now;
        return `${taking / 1000} s`;
    }
    private static prevDateTime = new Date();
    public startDateTime;
    public endDateTime;
    private watchModel = false;
    public init() {
        this.showVersion();
        process.once("SIGINT", () => {
            console.log("安全退出");
            process.exit();
        });
    }
    public setWatchModel(watchModel = true) {
        this.watchModel = watchModel;
        return this;
    }
    public showVersion() {
        console.log("->", "showVersion",
            "node@" + execSync("node -v").toString().replace(/\r|\n/g, ""),
            "npm@v" + execSync("npm -v").toString().replace(/\r|\n/g, ""),
            "yarn@" + execSync("yarn --version").toString().replace(/\r|\n/g, ""),
            "typescipt@" + execSync("tsc -v").toString().replace(/\r|\n/g, ""),
        );
    }
    public async sendMessage(titleStr: string, messageStr: string) {
        if (argv["no-notify"]) {
            return;
        }
        const msg = {
            message: messageStr.substr(0, 100),
            title: titleStr,
            wait: false,
        };
        // console.log("sendMessage", titleStr, messageStr);
        Notifier.notify(msg);
    }
    public start() {
        this.startDateTime = new Date();
        console.log();
        console.log("-------------------------------编译详细信息-------------------------------------");
    }
    public end() {
        log4js.restoreConsole();
        this.endDateTime = new Date();
        console.log("-------------------------------编译信息结束-------------------------------------");
        console.log("编译总耗时", (this.endDateTime.getTime() - this.startDateTime.getTime()) / 1000, "s");
        console.log();
        this.sendMessage("首次编译结束", "编译总耗时 " +
            (this.endDateTime.getTime() - this.startDateTime.getTime()) / 1000 + " s");
        this.replaceConsole();
    }

    public async cleanAsync() {
        await new CleanTask().start();
    }
    /**
     * @param {boolean} must 是否必须返回版本号
     * @deprecated use PackageInfo
     */
    public getVersion(must = false) {
        let version = Number(process.argv[2]);
        if (isNaN(version)) {
            if (must) {
                throw new Error("HelperTask > 未能获jenkins的版本号");
            }
            version = 0;
        }
        return version;
    }

    public async cleanAndReplaceAsync() {
        await this.replaceConsole();
        await this.cleanAsync();
        // await new TSLint().run();
    }

    public replaceConsole() {
        const pattern = "[%-5p] %d{yyyy-MM-dd hh:mm:ss.SSS} %m";
        const logConfig = {
            appenders: [
                {
                    layout: {
                        pattern: this.watchModel === true ? `%[${pattern}%]` : pattern,
                        type: "pattern",
                    },
                    type: "console",
                },
            ],
        };
        log4js.configure(logConfig);
        log4js.replaceConsole();
    }
}

export default HelperTask;
