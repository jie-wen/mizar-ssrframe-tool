import * as Path from "path";
import * as WebpackRaw from "webpack";
import ConfigHelper from "../libs/ConfigHelper";
import { Logger as console } from "../libs/Logger";
import { HelperTask } from "./HelperTask";

export interface IPackageInfo {
    browserVendor: string[];
    cdn: string;
}

const webpack: any = WebpackRaw;

export class VendorPack {
    public cdn = ConfigHelper.get("package", "cdn");
    public watchModel = false;
    public rootPath = Path.normalize("./");
    public browserVendor = ConfigHelper.get("config/configure", "vendorPack.browserVendor", []);
    public taskName = "VendorPack";
    public vendorModel = false;
    // private minify = ConfigHelper.get("config/configure", "vendorPack.minify", "false");
    public setWatchModel(wacthModel) {
        this.watchModel = wacthModel;
        return this;
    }

    public async run() {
        console.log("->", this.taskName, HelperTask.taking());
        if (this.browserVendor.length > 0) {
            console.info("VendorPack > start", this.browserVendor.join(","));
            await this.pack();
            this.vendorModel = true;
            return true;
        } else {
            console.warn("VendorPack", "is disabled", this.browserVendor);
        }
        this.vendorModel = false;
        return false;
    }
    public getVendorModel() {
        return this.vendorModel;
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
    private async pack() {
        return new Promise((resolve, reject) => {
            const config = {
                entry: {
                    vendor: this.browserVendor,
                },
                module: {
                    rules: [
                        // {
                        //     test: require.resolve("es6-shim"),
                        //     use: "imports-loader?this=>window",
                        // },
                        // {
                        //     test: require.resolve("es6-promise"),
                        //     use: "imports-loader?this=>window",
                        // },
                        // {
                        //     test: require.resolve("jquery"),
                        //     use: "imports-loader?this=>window",
                        // },
                    ],
                },
                name: "client-vendor",
                output: {
                    filename: "[name].js?[hash]",
                    library: "RssrFrameVendor",
                    path: Path.resolve(`${this.rootPath}build/client/${this.cdn}`),
                },
                plugins: [
                    // new webpack.ProvidePlugin({
                    //     jquery: "jQuery",
                    // }),
                ],
            };
            config.plugins.push(new webpack.DllPlugin({
                context: Path.resolve(`${this.rootPath}build/client/${this.cdn}`),
                name: "RssrFrameVendor",
                path: Path.resolve(`${this.rootPath}build/client/${this.cdn}/vendor-manifest.json`),
            }));

            let NODE_ENV = JSON.stringify("development");

            if (this.watchModel === false) {
                NODE_ENV = JSON.stringify("production");
                config.plugins.push(this.minifyCode());
            }

            const defineOption = {
                "process.env": {
                    NODE_ENV,
                },
            };
            config.plugins.push(new webpack.DefinePlugin(defineOption));
            const compiler = webpack(config);
            compiler.run((error, stats) => {
                if (error === null) {
                    this.done(error, stats);
                    resolve();
                } else {
                    this.done(error, stats);
                    reject();
                }
            });
        });
    }

    private done(error, stats) {
        if (error === null) {
            console.info(this.taskName, "pack.done");
        } else {
            console.info(this.taskName, "pack.done.error", error);
            if (stats.compilation.errors.length > 0) {
                const errors = stats.compilation.errors[0];
                try {
                    console.warn(this.taskName, "代码有错误",
                        errors.module.rawRequest, "错误数", stats.compilation.errors.length);
                    console.error(this.taskName, errors.message);
                } catch (error) {
                    console.error(this.taskName, errors);
                }
            }
        }
    }
}
export default VendorPack;
