import * as DirectoryNamedWebpackPlugin from "directory-named-webpack-plugin";
import * as ExtractTextPlugin from "extract-text-webpack-plugin";
import * as fs from "fs-extra";
import * as klaw from "klaw";
import * as Path from "path";
import * as webpack from "webpack";
import { argv } from "yargs";
import getGlobalConfig from "../getGlobalConfig";
import { ConfigHelper } from "../libs/ConfigHelper";
import { Logger as console } from "../libs/Logger";
import { WebpackTaskBase } from "../libs/WebpackTaskBase";
import { HelperTask } from "./HelperTask";
import { IPackageInfo, VendorPack } from "./VendorPack";

export class IsomorphicPack extends WebpackTaskBase {
    public cdnPath = ConfigHelper.get("package", "cdn");
    public entryPaths = [];
    public rootPath: string = "./";
    public src = "src/isomorphic/clientEntries";
    public vendorModel: boolean = false;
    private tslintConfig = ConfigHelper.get("config/configure", "tslint", { enable: true });
    private publicPath = "/" + this.cdnPath + "/";
    private globalConfig;
    constructor() {
        super();
        this.globalConfig = getGlobalConfig();
    }
    public setWatchModel(watchModel: boolean) {
        this.watchModel = watchModel;
        return this;
    }

    public setCDNPath(cdnPath = "") {
        this.cdnPath = cdnPath;
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
        console.log("->", "IsomorphicPack", HelperTask.taking());
        this.setTaskName("IsomorphicPack");
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
            const react16Depends = ["core-js/es6/map", "core-js/es6/set"];
            const entries = {};
            const entryDir = this.rootPath + this.src;
            if (!fs.existsSync(entryDir)) {
                console.warn("isomorphic pack build入口目录不存在：", entryDir);
                resolve({});
                return;
            }
            const walk = klaw(entryDir);
            walk.on("data", (state) => {
                const src = state.path;
                if (/\.ts|\.tsx|\.js/.test(src)) {
                    const dirName = src.replace(Path.resolve(this.rootPath), "")
                        .replace(".tsx", ".js")
                        .replace(".ts", ".js")
                        .replace(/\\/g, "/")
                        .replace("/" + this.src + "/", "");
                    entries[dirName] = [...react16Depends, src];
                }
            });
            walk.on("end", () => {
                console.info("IsomorphicPack.scan.end", Path.resolve(this.rootPath));
                console.info("IsomorphicPack.pack.keys", Object.keys(entries).join(","));
                resolve(entries);
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
            output: {
                chunkFilename: "chunk-[name]-[chunkhash:8].js",
                // publicPath: this.publicPath,
                filename: "[name]",
                path: this.globalConfig.clientOutput,
            },
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
                                            modules: true,
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
                                            modules: true,
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
                        test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|swf)(\?.*)?$/,
                        use: [
                            {
                                loader: "url-loader",
                                options: {
                                    limit: 8192,
                                    name: "assets/[name]_[hash:8].[ext]",
                                },
                            },
                        ],
                    },
                ]),
            },
            name: "IsomorphicPack",
            plugins: [
                // new webpack.ProvidePlugin({
                //     Promise: "bluebird",
                // }),
                new webpack.HashedModuleIdsPlugin(),
                new ExtractTextPlugin({
                    filename: (getPath) => {
                        return getPath("[name]_module.css").replace(".js", "");
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
                Path.resolve(this.globalConfig.clientOutput, "vendor-manifest.json");
            const manifest = fs.readJsonSync(manifestPath);
            const dllReferencePlugin = new webpack.DllReferencePlugin({
                context: this.globalConfig.clientOutput,
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
                ConfigHelper.get("config/configure", "clientPack.cdn", "//static1.cnd.cn") +
                "/" +
                this.cdnPath + "/";
        }

    }
}
export default IsomorphicPack;
