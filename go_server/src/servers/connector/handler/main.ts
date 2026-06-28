import Application from "../../../../lib/application";
import { Session } from "../../../../lib/components/session"
import Remote from "../remote/main";
import KatagoAnalysisRemote from "../../katagoAnalysis/remote/main";
import KatagoGTPRemote from "../../katagoGTP/remote/main";
import { app } from "../../../../lib/myServer";

export default class Handler {
    app: Application;
    constructor(app: Application) {
        this.app = app;
    }
    async enter(msg: { sequenceId: number , uid: number }, session: Session, next: Function) {
        // const ok = await this.app.rpc("gate").gate.main.isTokenOk(msg);
        // if (!ok) {
        //     return next({ code: 1, "info": "token错误" });
        // }
        session.bind(msg.uid);
        next({ sequenceId: msg.sequenceId, code: 200 });
    }

    /**
     * 重连
     */
    async reconnectEnter(msg: { sequenceId: number , "uid": number }, session: Session, next: Function) {
        if (session.uid) {
            return;
        }
        session.bind(msg.uid);
        next({ sequenceId: msg.sequenceId, code: 200 });
    }

    async ping(msg: { "msg": string }, session: Session, next: Function) {
        next({ "msg": "pong" });

        console.log("rpc start")
        let remote = this.app.rpc("connector-server-1").connector.main as Remote
        let data = await remote.test(msg.msg);
        console.log("rpc end : ", data);
    }

    async useKatago(msg: { sequenceId: number, katagoType : string }, session: Session, next: Function) {

        if(msg.katagoType == "katagoAnalysis")
        {
            var katagoServers = this.app.serversConfig["katagoAnalysis"];
            for (let one of katagoServers) {
                let remote = this.app.rpc(one.id).katagoAnalysis.main as KatagoAnalysisRemote
                let data = await remote.use(session.uid);
                if (data) {
                    session.set({ "katagoAnalysisServerId": one.id });
                    next({ sequenceId: msg.sequenceId, code: 200 });
                    return;
                }
            }
        }
        else if(msg.katagoType == "katagoGTP")
        {
            var katagoServers = this.app.serversConfig["katagoGTP"];
            for (let one of katagoServers) {
                let remote = this.app.rpc(one.id).katagoGTP.main as KatagoGTPRemote
                let data = await remote.use(session.uid);
                if (data) {
                    session.set({ "katagoGTPServerId": one.id });
                    next({ sequenceId: msg.sequenceId, code: 200 });
                    return;
                }
            }
        }
        next({ sequenceId: msg.sequenceId, code: 1 });
    }

    async unuseKatago(msg: { sequenceId: number }, session: Session, next: Function) {
        let katagoAnalysisServerId = session.get("katagoAnalysisServerId");
        if(katagoAnalysisServerId)
        {
            let remote = this.app.rpc(katagoAnalysisServerId).katagoAnalysis.main as KatagoAnalysisRemote
            let data = remote.unuse(session.uid);
        }
        let katagoGTPServerId = session.get("katagoGTPServerId");
        if(katagoGTPServerId)
        {
            let remote = this.app.rpc(katagoGTPServerId).katagoGTP.main as KatagoGTPRemote
            let data = remote.unuse(session.uid);
        }
        next({ sequenceId: msg.sequenceId, code: 200 });
    }
}

// 玩家socket断开
export function onUserLeave(session: Session) {
    console.log("--- one user leave :", session.uid);

    if (!session.uid) {
        return;
    }

    let katagoAnalysisServerId = session.get("katagoAnalysisServerId");
    if(katagoAnalysisServerId)
    {
        let remoteAnalysis = app.rpc(katagoAnalysisServerId).katagoAnalysis.main as KatagoAnalysisRemote;
        remoteAnalysis.unuse(session.uid);
    }

    let katagoGTPServerId = session.get("katagoGTPServerId");
    if(katagoGTPServerId)
    {
        let remoteGTP = app.rpc(katagoGTPServerId).katagoGTP.main as KatagoGTPRemote;
        remoteGTP.unuse(session.uid);
    }

}