import * as fs from "fs-extra";
import * as JSONCParser from "jsonc-parser";
import * as Path from "path";
import { argv } from "yargs";
import { ConfigHelper } from "../libs/ConfigHelper";
import { DateUtil } from "../libs/DateUtil";
import { Logger as console } from "../libs/Logger";
import { ObjectUtil } from "../libs/ObjectUtil";
import { ConfigTask } from "./ConfigTask";
import { HelperTask } from "./HelperTask";
export class PackageInfo {
    private version = 0;
    private versionDate = "";
    private packageName = null;
    private browserVendor = [];
    private cdn = "";
    private rootPath = Path.resolve("./");
    private packageJson;
    private buildPath = Path.resolve("./build");
    public async run() {
        console.log("->", "PackageInfo", HelperTask.taking());
        await new ConfigTask().run();
        this.init();
        // const version = ;
        this.setVersion();
        this.setCDN();
        this.outputPackageJson();
        return this;
    }
    // public getProcessVersion(ver: boolean | number = false) {
    //     if (typeof ver === "number") {
    //         return ver;
    //     }
    //     let version = Number(process.argv[2]);
    //     if (isNaN(version)) {
    //         if (ver) {
    //             throw new Error("PackageInfo > 未获取到jenkins版本号");
    //         }
    //         version = 0;
    //     }
    //     return version;
    // }
    public getPackageName() {
        return this.packageName;
    }
    public init() {
        this.mkdir();
        let packageJson: any = fs.readFileSync(this.rootPath + "/package.json", "utf8");
        packageJson = JSON.parse(packageJson);
        this.packageName = ConfigHelper.get("config/app", "app_name");
        let vendor = ConfigHelper.get("config/configure", "vendorPack.browserVendor", []);
        if (typeof vendor === "object") {
            vendor = Object.keys(vendor);
        }
        packageJson.browserVendor = vendor;
        this.packageJson = packageJson;
    }
    public getBrowserVendor() {
        return this.packageJson.browserVendor;
    }
    public replacePackage() {
        let packageJson = this.packageJson;
        packageJson.scripts = packageJson.scriptOperation;
        // tslint:disable-next-line:no-string-literal
        packageJson.scriptOperation = undefined;
        packageJson.devDependencies = undefined;
        packageJson = ObjectUtil.sort(packageJson);
        return packageJson;
    }
    public outputPackageJson() {
        const packageJson = this.replacePackage();
        fs.writeJsonSync(this.buildPath + "/package.json", packageJson, { spaces: 2 });
    }
    public outputConfigInfo() {
        fs.outputJSONSync(this.buildPath + "/config/info.json", {
            browserVendor: this.packageJson.browserVendor, // to fix ProjectTools
            cdn: this.cdn,
            name: this.packageJson.name,
            version: this.version,
        });
        return this;
    }
    public setBuildPath(buildPath) {
        this.buildPath = Path.normalize(buildPath);
    }
    public setCDN() {
        const cdnType = argv.cdnType ? argv.cdnType : ConfigHelper.get("config/configure", "cdnType", "version");
        console.info("PackageInfo.setCDN.cdnType", cdnType);
        switch (cdnType) {
            case "datetime":
                this.versionDate = DateUtil.getDateTimeNumber(new Date());
                break;
            case "none":
                this.versionDate = "";
                break;
            case "version":
                this.versionDate = this.version.toString();
                break;
            case "mainVersion":
                this.versionDate = this.getMainVersion();
                break;
            default:
                this.versionDate = DateUtil.getDateTimeNumber(new Date());
        }
        if (cdnType === "none") {
            this.packageJson.cdn = "";
        } else {
            this.packageJson.cdn = this.packageName;
            if (this.versionDate !== "") {
                this.packageJson.cdn += "/" + this.versionDate;
            }
        }
        this.cdn = this.packageJson.cdn;
        console.info("PackageInfo.setCDN.cdn", this.cdn);
    }
    public getCDN() {
        return this.packageName + "/" + this.versionDate;
    }
    public setVersion() {
        const version = ConfigHelper.getPackageVersion();
        this.packageJson.version = version;
        this.version = version;
        console.info("PackageInfo.setVersion.version", this.packageJson.version);
    }
    public getVersion(version: number) {
        const ver = this.packageJson.version.split(".");
        ver[2] = Number(ver[2]) + version;
        return ver.join(".");
    }
    private getMainVersion() {
        const ver = this.packageJson.version.split(".");
        return `${ver[0]}.x-latest`;
    }
    private getPackageJson() {
        return this.packageJson;
    }
    private mkdir() {
        try {
            fs.mkdirpSync(this.buildPath);
        } catch (error) {
            console.error("PackageInfo.mkdir.CAN_NOT_MKDIR", this.buildPath);
        }
    }
}
export default PackageInfo;
