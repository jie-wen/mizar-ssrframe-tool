import * as browserSync from "browser-sync";
import * as finalhandler from "finalhandler";
import * as http from "http";
import * as Path from "path";
import * as serveIndex from "serve-index";
import * as serveStatic from "serve-static";
import { HelperTask } from "./HelperTask";
/**
 * 具备目录浏览功能的静态服务器
 */
export default class WebServer {
    private rootPath: string = Path.normalize("./");
    public async run() {
        return new Promise((resolve, reject) => {
            browserSync(
                {
                    codeSync: false,
                    directory: true,
                    notify: false,
                    // open: false,
                    port: 8062,
                    server: {
                        baseDir: [
                            Path.normalize(`${this.rootPath}/build/client`),
                            Path.normalize(`${this.rootPath}/src/client`),
                        ],
                    },
                },
                (error, bs) => {
                    if (error === null) {
                        resolve();
                    } else {
                        reject();
                    }
                });
        });
    }
}
