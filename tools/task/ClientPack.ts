import * as DirectoryNamedWebpackPlugin from "directory-named-webpack-plugin";
import * as ExtractTextPlugin from "extract-text-webpack-plugin";
import * as fs from "fs-extra";
import * as klaw from "klaw";
import * as Path from "path";
import * as webpack from "webpack";
import { argv } from "yargs";
import { ConfigHelper } from "../libs/ConfigHelper";
import { Logger as console } from "../libs/Logger";
import { WebpackTaskBase } from "../libs/WebpackTaskBase";
import { HelperTask } from "./HelperTask";
import { IPackageInfo, VendorPack } from "./VendorPack";

export class ClientPack extends WebpackTaskBase {
    public cdn = ConfigHelper.get("package", "cdn");
    public entryPaths = [];
    public output = Path.normalize(`build/client/${ConfigHelper.get("package", "cdn")}/script/`);
    public rootPath: string = "./";
    public src = "src/client/router";
    public vendorModel: boolean = false;
    private cssModule = ConfigHelper.get("config/configure", "clientPack.cssModule", true);
    private tslintConfig = ConfigHelper.get("config/configure", "tslint", { enable: true });
    // private minify = ConfigHelper.get("config/configure", "clientPack.minify", undefined);
    private publicPath = "/" + ConfigHelper.get("package", "cdn") + "/script/";
    public setWatchModel(watchModel: boolean) {
        this.watchModel = watchModel;
        console.info("ClientPack.cssModule", this.cssModule);
        return this;
    }

    /**
     * @deprecated
     * @param packageInfo
     * @param watchModel
     * @param vendorModel
     */
    // public init(packageInfo = {
    //     browserVendor: [],
    //     cdn: "",
    // },
    //     watchModel = false,
    //     vendorModel = true) {
    //     this.taskName = "ClientPack";
    //     // this.packageInfo = packageInfo
    //     this.watchModel = watchModel;
    //     this.vendorModel = vendorModel;
    //     this.output = `build/client/${this.cdn}/script/`;
    // }
    public setCDN(cdn = "") {
        this.cdn = cdn;
        this.output = Path.normalize(`build/client/${this.cdn}/script/`);
    }

    public setOutput(output: string) {
        this.output = output;
    }

    public getOutput() {
        return this.output;
    }

    public setSRC(src: string) {
        this.src = src;
    }
    public getSRC() {
        return this.src;
    }
    /**
     * 请使用run
     * @deprecated
     */
    public async start() {
        return await this.run();
    }
    public setVendorModel(vendorModel: boolean) {
        this.vendorModel = vendorModel;
        return this;
    }
    public async run() {
        console.log("->", "ClientPack", HelperTask.taking());
        this.setTaskName("ClientPack");
        // await new VendorPack().run();
        try {
            const entry = await this.scan();
            if (!entry || Object.keys(entry).length === 0) {
                return;
            }
            if (argv.verbose) {
                console.info(this.taskName, "run.entry", entry);
            }
            await this.pack(entry);
        } catch (error) {
            console.error(this.taskName, "FATAL_ERROR", error.message);
            throw error;
        }
    }

    /**
     * 获取打包任务检索到的文件列表
     */
    public getEntryPaths() {
        return this.entryPaths;
    }

    /**
     * 入口文件搜寻
     */
    private async scan() {
        return new Promise((resolve, reject) => {
            const entry = {};
            const router = this.rootPath + this.src;
            if (!fs.existsSync(router)) {
                console.warn("目录不存在：", router);
                resolve({});
                return;
            }
            const walk = klaw(router);
            walk.on("data", (state) => {
                const src = state.path;
                if (/\.ts|\.tsx|\.js/.test(src)) {
                    const dirName = src.replace(Path.resolve(this.rootPath), "")
                        .replace(".tsx", ".js")
                        .replace(".ts", ".js")
                        .replace(/\\/g, "/")
                        .replace("/src/client/router/", "")
                        .replace("/" + this.src, "");
                    entry[dirName] = src;
                }
            });
            walk.on("end", () => {
                console.info("ClientPack.scan.end", Path.resolve(this.rootPath));
                console.info("ClientPack.pack.keys", Object.keys(entry).join(","));
                resolve(entry);
            });
            walk.on("error", (error) => {
                reject(error);
            });
        });
    }

    private async pack(entryPaths) {
        console.info("ClientPack.pack.run", entryPaths);
        this.setPublicPath();
        this.entryPaths = Object.keys(entryPaths);
        let localIdentName = "_[hash:base64:5]";
        let sourceMap = false;
        if (this.watchModel) {
            localIdentName = "[hash:base64:5]--[path][name]__[local]";
            sourceMap = true;
        }
        if (this.cssModule === false) {
            localIdentName = "[local]";
        }
        console.info("ClientPack.pack.localIdentName", localIdentName);
        const tslintPath = Path.resolve(`${this.rootPath}tslint.json`);
        const tsConfigPath = Path.resolve(`${this.rootPath}tsconfig.json`);
        const rules = [];
        if (this.tslintConfig.enable) {
            rules.push({
                test: /\.ts(x?)$/,
                enforce: "pre",
                loader: "tslint-loader",
                options: {
                    configFile: fs.existsSync(tslintPath) ? tslintPath : "",
                    tsConfigFile: fs.existsSync(tsConfigPath) ? tsConfigPath : "",
                    // 紧在调试时以error的形式提示错误信息，正式build时以warning的形式提示，主要考虑到兼容已有项目
                    emitErrors: this.watchModel === true,
                },
            });
        }
        const config = {
            cache: true,
            // debug: true,
            devtool: "source-map",
            entry: entryPaths,
            externals: [
                (context, request, callback) => {
                    const isExternal = /\/server\//i.test(request);
                    if (isExternal || request === "node-mocks-http") {
                        callback(null, "''");
                    } else {
                        callback();
                    }
                },
            ],
            module: {
                rules: rules.concat([
                    // {
                    //     test: /\.js$/,
                    //     // tslint:disable-next-line:object-literal-sort-keys
                    //     exclude: /(node_modules|bower_components)/,
                    //     loader: "babel-loader",
                    //     query: {
                    //         // presets: ['env'],
                    //         // plugins: ["transform-runtime"],
                    //     },
                    // },
                    {
                        test: /\.ts$/,
                        use: [
                            {
                                loader: "ts-loader",
                                options: {
                                    compilerOptions: {
                                        declaration: false,
                                    },
                                },
                            },
                        ],
                    },
                    {
                        test: /\.tsx$/,
                        use: [
                            {
                                loader: "ts-loader",
                                options: {
                                    compilerOptions: {
                                        declaration: false,
                                    },
                                },
                            },
                        ],
                    },
                    {
                        test: /\.css$/,
                        use:
                        ExtractTextPlugin.extract({
                            fallback: "style-loader",
                            use: [
                                {
                                    loader: "css-loader",
                                    options: {
                                        importLoaders: 1,
                                        sourceMap: this.watchModel,
                                        modules: this.cssModule,
                                        camelCase: true,
                                        localIdentName:
                                        this.watchModel ? "[name]-[local]-[hash:base64:5]" : "[hash:base64:5]",
                                        minimize: !this.watchModel,
                                        discardComments: { removeAll: true },
                                    },
                                },
                                {
                                    loader: "postcss-loader",
                                    options: {
                                        plugins: () => {
                                            return [
                                                require("precss"),
                                                require("autoprefixer"),
                                            ];
                                        },
                                    },
                                },
                            ],
                            publicPath: "",
                        }),
                    },
                    {
                        test: /\.less$/,
                        use:
                        ExtractTextPlugin.extract({
                            fallback: "style-loader",
                            use: [
                                {
                                    loader: "css-loader",
                                    options: {
                                        sourceMap: this.watchModel,
                                        modules: this.cssModule,
                                        camelCase: true,
                                        localIdentName:
                                        this.watchModel ? "[name]-[local]-[hash:base64:5]" : "[hash:base64:5]",
                                        minimize: !this.watchModel,
                                        discardComments: { removeAll: true },
                                    },
                                },
                                {
                                    loader: "postcss-loader",
                                    options: {
                                        plugins: () => {
                                            return [
                                                require("precss"),
                                                require("autoprefixer"),
                                            ];
                                        },
                                    },
                                },
                                {
                                    loader: "less-loader", options: {
                                        sourceMap,
                                    },
                                },
                            ],
                            publicPath: "",
                        }),
                    },
                    {
                        test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)(\?.*)?$/,
                        use: [
                            {
                                loader: "url-loader",
                            },
                        ],
                    },
                ]),
            },
            name: "ClientPack",
            output: {
                chunkFilename: "chunk-[name]-[chunkhash:8].js",
                publicPath: this.publicPath,
                filename: "[name]",
                path: Path.resolve(`${this.rootPath}${this.output}`),
            },
            plugins: [
                // new webpack.ProvidePlugin({
                //     Promise: "bluebird",
                // }),
                new webpack.HashedModuleIdsPlugin(),
                new ExtractTextPlugin({
                    filename: (getPath) => {
                        return getPath("../style/[name]_module.css").replace(".js", "");
                    },
                }),
            ],
            // publicPath: `/script/`,
            resolve: {
                extensions: [".ts", ".tsx", ".js", ".css", ".png", ".jpg", ".gif", ".less"],
                modules: [
                    Path.resolve("src"),
                    Path.resolve(`${this.rootPath}/node_modules`),
                ],
                plugins: [new DirectoryNamedWebpackPlugin()],
            },
        };

        let NODE_ENV = JSON.stringify("development");
        // 不是监控模式就压缩代码
        if (this.watchModel === false) {
            config.devtool = undefined;
            NODE_ENV = JSON.stringify("production");
            config.plugins.push(this.minifyCode());
        }

        const defineOption = {
            "process.env": {
                NODE_ENV,
            },
        };
        config.plugins.push(new webpack.DefinePlugin(defineOption));

        if (this.vendorModel) {
            const manifestPath =
                Path.resolve(`${this.rootPath}build/client/${this.cdn}/vendor-manifest.json`);
            const manifest = fs.readJsonSync(manifestPath);
            const dllReferencePlugin = new webpack.DllReferencePlugin({
                context: Path.resolve(`${this.rootPath}build/client/${this.cdn}/script`),
                manifest,
            });
            config.plugins.push(dllReferencePlugin);
        }
        // if (argv.verbose) {
        console.info(this.taskName, "pack", { config: JSON.stringify(config) });
        // }
        await this.webpack(config);
    }
    private setPublicPath() {
        const chunk = ConfigHelper.get("config/configure", "clientPack.chunk", true);
        if (chunk && this.watchModel === false) {
            this.publicPath =
                ConfigHelper.get("config/configure", "clientPack.cdn", "//static1.cdn.cn") +
                "/" +
                ConfigHelper.get("package", "cdn") + "/script/";
        }

    }
}
export default ClientPack;
