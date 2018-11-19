import { argv } from "yargs";
/**
 * 支持--verbose参数，verbose存在时，log的日志才生效。info/warn/error不受影响
 */
export class Logger {
    public static log(...args) {
        const message = Logger.serializeArgs(args);
        console.log(message);
    }
    public static info(...args) {
        if (argv.verbose) {
            const message = Logger.serializeArgs(args);
            console.log(message);
        }
    }
    public static warn(...args) {
        // if (argv.verbose) {
        const message = Logger.serializeArgs(args);
        console.warn(message);
        // }
    }
    public static error(...args) {
        // if (argv.verbose) {
        const message = Logger.serializeArgs(args);
        console.error(message);
        // }
    }
    private static serializeArgs(args: any[]) {
        const message = [];
        args.map((value, index) => {
            switch (typeof value) {
                case "object":
                    message.push(JSON.stringify(value));
                    break;
                case "string":
                    message.push(value.replace(/\r|\n/g, ""));
                    break;
                default:
                    message.push(value);
                    break;
            }
        });
        return message.join(" ");

    }
}
