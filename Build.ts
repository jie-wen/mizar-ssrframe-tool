#!/usr/bin/env node
import { execSync } from "child_process";
import * as fs from "fs-extra";
import { argv } from "yargs";
import { HelperTask } from "./tools/task/HelperTask";
import { PackageInfo } from "./tools/task/PackageInfo";
import { PublishTask } from "./tools/task/PublishTask";
import { ShellTask } from "./tools/task/ShellTask";
import { UglifyJSTask } from "./tools/task/UglifyJSTask";

class Build {
    public async startup() {
        const task = new HelperTask();
        // 清理及数据准备工作
        task.init();
        task.start();
        await task.cleanAndReplaceAsync();

        // 开始编译工作
        await new PackageInfo().run();
        await new ShellTask().run("tsc -p tools");
        await new UglifyJSTask().run();
        if (argv.publish) {
            // 开始发布任务
            await new PublishTask().start();
        }
        task.end();
    }

}
(async () => {
    new Build().startup();
})();
