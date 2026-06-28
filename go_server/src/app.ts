
import { connector, createApp  } from "../lib/myServer";
import { Session } from "../lib/components/session"
import { getCpuUsage } from "./app/cpuUsage";
import { onUserLeave } from "./servers/connector/handler/main";
import winston, { format, transports } from "winston"
import path from "path"

let logger = winston.createLogger({
    transports: [
        new transports.File({
            filename:path.join('logs/', Date.now().toString()+'.log'),
            format: format.combine(
                format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                format.printf( info => `${info.timestamp} ${info.level}  ${info.message}` )
            )
        })
    ]
});

let app = createApp();

app.setConfig("connector", { "connector": connector.Ws, "clientOnCb": clientOnCb, "heartbeat": 60, "clientOffCb": clientOffCb, "interval": 50 });
app.setConfig("encodeDecode", { "msgDecode": msgDecode, "msgEncode": msgEncode });
app.setConfig("logger", (tag : string, level : string, msg : string) => {
    if(tag == "katagoAnalysis")
    {
        logger.log({ level: level, message: msg });
    }
    else if(tag == "katagoGTP")
    {
        logger.log({ level: level, message: msg });
    }
    else
    {
        if (level == "info" || level == "error") {
            console.log(msg);
        }
    }
});
app.setConfig("rpc", { "interval": 33 });
app.setConfig("serverList", () => {
    return [{ "title": "cpu", "value": getCpuUsage() }]
});

app.configure("connector", function () {
    app.route("katagoAnalysis", function (session: Session) {
        return session.get("katagoAnalysisServerId");
    });
    app.route("katagoGTP", function (session: Session) {
        return session.get("katagoGTPServerId");
    });
});

app.start();

process.on("uncaughtException", function (err: any) {
    console.log(err)
});


function msgDecode(cmd: number, msg: Buffer): any {
    let msgStr = msg.toString();
    console.log("↑ ", app.routeConfig[cmd], msgStr);
    return JSON.parse(msgStr);
}

function msgEncode(cmd: number, msg: any): Buffer {
    let msgStr = JSON.stringify(msg);
    console.log(" ↓", app.routeConfig[cmd], msgStr);
    return Buffer.from(msgStr);
}


function clientOnCb(session: Session) {
    console.log("one client on");
}

function clientOffCb(session: Session) {
    console.log("one client off");
    onUserLeave(session);
}



