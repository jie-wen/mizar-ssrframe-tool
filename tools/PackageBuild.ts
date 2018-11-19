#!/usr/bin/env node
import { argv } from "yargs";
import * as Path from "path";
import { ConfigHelper } from "./libs/ConfigHelper";
import { ClientAsset } from "./task/ClientAsset";
import { HelperTask } from "./task/HelperTask";
import { IsoAsset } from "./task/IsoAsset";
import { PackageInfo } from "./task/PackageInfo";
import { PublishTask } from "./task/PublishTask";
import { ShellTask } from "./task/ShellTask";

class PackageBuild {
    public async startup() {
        const task = new HelperTask();

        task.init();
        task.start();
        await task.cleanAndReplaceAsync();
        await new PackageInfo().run();
        // if (argv.component) {
        await new ClientAsset(
            "./src/client/**/*.+(js|less|css|txt|ico|ttf|gif|png|jpg|swf|woff|woff2|webp|mp4|avi|flv)")
            .setCDN("").run();
        await new IsoAsset(
            "./src/iso/**/*.+(js|less|css|txt|ico|ttf|gif|png|jpg|swf|woff|woff2|webp|mp4|avi|flv)")
            .setCDN("").run();
        // }
        await new ShellTask().run("tsc -p src");
        if (argv.publish) {
            // 开始发布任务
            await new PublishTask().start();
        }task.end();
    }
}

(async () => {
    try {
        await new PackageBuild().startup();
    } catch (error) {
        process.exit(1);
    }
})();
