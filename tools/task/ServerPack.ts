import * as fs from "fs-extra";
import * as  klaw from "klaw";
import * as Path from "path";
import * as webpack from "webpack";
import * as nodeExternals from "webpack-node-externals";
import { argv } from "yargs";
import getGlobalConfig from "../getGlobalConfig";
import { ConfigHelper } from "../libs/ConfigHelper";
import { Logger as console } from "../libs/Logger";
import { WebpackTaskBase } from "../libs/WebpackTaskBase";
import { HelperTask } from "./HelperTask";
import { RunServer } from "./RunServer";

export class ServerPack extends WebpackTaskBase {
    private globalConfig;
    private tslintConfig = ConfigHelper.get("config/configure", "tslint", { enable: true });
    private cssModule = ConfigHelper.get("config/configure", "serverPack.cssModule", true);
    private rootPath: string = Path.normalize("./");
    private src = "src/server/index";
    private entryPaths = [];
    private autoRun = false;
    private debug = 0;
    public constructor() {
        super();
        this.taskName = "ServerPack";
        this.globalConfig = getGlobalConfig();
    }
    public setAutoRun(autoRun: boolean = true) {
        this.autoRun = autoRun;
        this.debug = ConfigHelper.get("config/configure", "serverPack.debugPort", 0);
        return this;
    }
    public setWatchModel(watchModel: boolean) {
        this.watchModel = watchModel;
        return this;
    }
    public async scan() {
        return new Promise((resolve) => {
            const entry = {};
            const router = this.rootPath + this.src;
            const walk = klaw(router);
            walk.on("data", (state) => {
                const src = state.path;
                if (/\.ts?/.test(src)) {
                    const dirName = src.replace(Path.resolve(this.rootPath), "")
                        .replace(".tsx", ".js")
                        .replace(".ts", ".js")
                        .replace(/\\/g, "/")
                        .replace("/" + this.src, "");
                    entry[dirName] = src;
                }
            });
            walk.on("end", () => {
                console.info(this.taskName, "scan.done", Path.resolve(this.rootPath));
                console.info(this.taskName, "pack.keys", Object.keys(entry).join(","));
                resolve(entry);
            });
        });
    }
    public getEntryPaths() {
        return this.entryPaths;
    }
    public init() {
        this.taskName = "ServerPack";
    }
    public setSRC(src: string) {
        this.src = src;
    }
    public getSRC() {
        return this.src;
    }
    public async run() {
        console.log("->", this.taskName, HelperTask.taking());
        console.info(this.taskName, { "index.js": Path.resolve(`${this.rootPath}/${this.src}`) });
        await this.pack({ "index.js": Path.resolve(`${this.rootPath}/${this.src}`) });
    }
    public async pack(entry) {
        this.entryPaths = Object.keys(entry);
        const tslintPath = Path.resolve(`${this.rootPath}tslint.json`);
        const tsConfigPath = Path.resolve(`${this.rootPath}tsconfig.json`);
        const rules = [];
        if (this.tslintConfig.enable) {
            rules.push({
                exclude: /node_modules/,
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
            devtool: "source-map",
            entry,
            externals: [
                nodeExternals({
                    whitelist: [
                        /^mizar\-ssrframe/,
                    ],
                }),
            ],
            module: {
                rules: rules.concat([
                    {
                        test: /((\.ts)|(\.tsx))$/,
                        exclude: /node_modules/,
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
                        test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)(\?.*)?$/,
                        use: [
                            {
                                loader: "url-loader",
                                options: {
                                    limit: 8192,
                                    outputPath:
                                        Path.relative(this.globalConfig.rootOutput,
                                            this.globalConfig.clientOutput) + "/",
                                    name: "assets/[name]_[hash:8].[ext]",
                                    fallback: Path.resolve(__dirname, "../libs/loaders/custom-file-loader"),
                                },
                            },
                        ],
                    },
                    {
                        test: /\.css$/,
                        use: [
                            { loader: "isomorphic-style-loader" },
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
                    },
                    {
                        test: /\.less$/,
                        use: [
                            { loader: "isomorphic-style-loader" },
                            {
                                loader: "css-loader",
                                options: {
                                    sourceMap: this.watchModel,
                                    modules: this.cssModule,
                                    camelCase: true,
                                    localIdentName:
                                        this.watchModel ? "[name]-[local]-[hash:base64:5]" : "[hash:base64:5]",
                                    // CSS Nano http://cssnano.co/options/
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
                                    sourceMap: false,
                                },
                            },
                        ],
                    },
                ]),
            },
            name: this.taskName,
            node: {
                Buffer: false,
                __dirname: false,
                __filename: false,
                console: false,
                global: false,
                process: false,
            },
            output: {
                filename: "[name]",
                libraryTarget: "commonjs2",
                path: Path.resolve(`${this.rootPath}/${this.globalConfig.rootOutput}`),
            },
            plugins: [
                new webpack.NoEmitOnErrorsPlugin(),
            ],
            resolve: {
                extensions: [".ts", ".tsx", ".js", ".png", ".jpg", ".gif", ".less"],
                modules: [
                    Path.resolve(`${this.rootPath}/node_modules`),
                ],
            },
            target: "node",
        };

        if (this.watchModel === false) {
            config.devtool = undefined;
            config.plugins.push(this.minifyCode());
        }
        if (argv.verbose) {
            console.info("ServerPack.pack", { config: JSON.stringify(config) });
        }
        await this.webpack(config);
    }
    protected async doneCallback() {
        if (this.autoRun && this.watchModel === true) {
            RunServer("index", this.debug);
        }
    }
}

export default ServerPack;
