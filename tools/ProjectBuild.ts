#!/usr/bin/env node
import * as fs from "fs-extra";
import * as Path from "path";
import { argv } from "yargs";
import { ConfigHelper } from "./libs/ConfigHelper";
import { ClientAsset } from "./task/ClientAsset";
import { ClientPack } from "./task/ClientPack";
import { ConfigTask } from "./task/ConfigTask";
import { HelperTask } from "./task/HelperTask";
import { IsomorphicPack } from "./task/IsomorphicPack";
import { PackageInfo } from "./task/PackageInfo";
import { PublishTask } from "./task/PublishTask";
import { ServerAsset } from "./task/ServerAsset";
import { ServerPack } from "./task/ServerPack";
import { ShellTask } from "./task/ShellTask";
import { StylePack } from "./task/StylePack";
import { VendorPack } from "./task/VendorPack";

export class ProjectBuild {
    private watchModel = false;
    private runServerModel = false;
    private packageModel = false;
    private publishModel = false;
    public async start() {
        const task = new HelperTask();
        await task.cleanAsync();
        const cdnType = ConfigHelper.get("config/configure", "cdnType", "version");
        if (this.packageModel) {
            ConfigHelper.set("config/configure", "cdnType", "none");
            // console.log("build.packageModel", this.packageModel);
            await this.build();
            fs.copySync("src", "build", /(\.ts|\.tsx)$/); // 用于拷贝非ts代码以外的样式或图片等
            await new ShellTask().run("tsc -p src/client");
            await new ShellTask().run("tsc -p src/server");
        }
        ConfigHelper.set("config/configure", "cdnType", cdnType);
        await this.build();
    }
    public setWatchModel(watchModel) {
        this.watchModel = watchModel;
    }
    public setPublishModel(publishModel) {
        this.publishModel = publishModel;
    }
    public setPackageModel(packageModel) {
        console.log("PackageModel", { packageModel });
        this.packageModel = packageModel;
    }
    public setRunServer(runServerModel) {
        this.runServerModel = runServerModel;
    }
    private async publish() {
        await new PublishTask().start();
    }
    private async build() {
        // 环境准备
        const task = new HelperTask();
        task.setWatchModel(this.watchModel);
        task.init();
        task.start();
        await task.replaceConsole();
        // 1. 进行配置项拷贝
        // await new ConfigTask().run();
        // 1.1 包信息生成
        await new PackageInfo().run();
        // 2. 生成样式或拷贝静态资源
        await new ClientAsset().setWatchModel(this.watchModel).run();
        await new ClientAsset(Path.resolve("./src/public/**/*"), "PublicAsset").setWatchModel(this.watchModel).run();
        await new ServerAsset().setWatchModel(this.watchModel).run();
        await new StylePack().setWatchModel(this.watchModel).run();
        await new StylePack()
            .setTaskName("Isomorphic StylePack")
            .setSrcPath("./src/isomorphic/styleEntries")
            .setTargetDir("")
            .setWatchModel(this.watchModel)
            .run();
        // 3. 生成ClientPack
        const vendor = await new VendorPack().setWatchModel(this.watchModel).run();
        const clientPack = new ClientPack();
        clientPack.setWatchModel(this.watchModel);
        clientPack.setVendorModel(vendor);
        await clientPack.run();
        // 4. 生成同构下的ClientPack
        const isomorphicClientPack = new IsomorphicPack();
        isomorphicClientPack.setWatchModel(this.watchModel);
        isomorphicClientPack.setVendorModel(vendor);
        await isomorphicClientPack.run();
        // 5. 生成ServerPack
        const serverPack = new ServerPack();
        serverPack.setAutoRun(this.runServerModel);
        serverPack.setWatchModel(this.watchModel);
        await serverPack.run();
        task.end();
    }

}

(async () => {
    const projectBuild = new ProjectBuild();
    if (argv.watch) {
        projectBuild.setWatchModel(true);
    }
    if (argv.runServer) {
        projectBuild.setRunServer(true);
    }
    if (argv.publish) {
        projectBuild.setPublishModel(true);
    }
    if (argv.package) {
        projectBuild.setPackageModel(true);
    }
    try {
        await projectBuild.start();
    } catch (error) {
        process.exit(1);
    }
})();
