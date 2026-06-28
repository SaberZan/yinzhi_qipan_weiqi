import Application from "../../../../lib/application";
import { Session } from "../../../../lib/components/session"
import KataGoGTP from "../../../app/katagoGTP/katagoGTP";

export default class Handler {
    app: Application;

    engine: KataGoGTP;
    constructor(app: Application) {
        this.app = app;
        this.engine = new KataGoGTP();
    }

    async initGame(msg: { sequenceId: number, size: number, rule: string, komi: number, handicap: number, rank: number,  player: string }, session: Session, next: Function) {
        await this.engine.initGame(msg.size, msg.rule, msg.komi, msg.handicap);
        // await this.engine.updateRank(msg.rank);
        var cmd = this.app.routeConfig.indexOf("katagoGTP.main.initGame");
        
        var data = {sequenceId: msg.sequenceId, code: 200 };
        var uidsid = [{ uid: session.uid, sid: session.getSid() }];

        this.app.sendMsgByUidSid(cmd, data, uidsid);
    }

    async play(msg: { sequenceId: number, color: string, gtp: string }, session: Session, next: Function) {
        await this.engine.play(msg.color, msg.gtp);
        console.log("play----color----", msg.color);
        var analysis = await this.engine.getAnalysis();
        var cmd = this.app.routeConfig.indexOf("katagoGTP.main.play");
        var data = {
            sequenceId: msg.sequenceId, 
            code: 200, 
            blackWinRate: msg.color.toUpperCase() == "B" ? 1 - (<any>analysis.rootInfo).winrate : ((<any>analysis.rootInfo).winrate), 
            ownerShip: analysis.ownership.map(x=> msg.color.toUpperCase() == "B" ? -x : x ) 
        };
        var uidsid = [{ uid: session.uid, sid: session.getSid() }];
        this.app.sendMsgByUidSid(cmd, data, uidsid);
    }

    async genMove(msg: { sequenceId: number, color: string }, session: Session, next: Function) {
        let moveResult = await this.engine.genMove(msg.color);
        console.log("genMove----color----", msg.color);
        var analysis = await this.engine.getAnalysis();
        var cmd = this.app.routeConfig.indexOf("katagoGTP.main.genMove");
        var data = { 
            sequenceId: msg.sequenceId, 
            code: moveResult != undefined ? 200 : 1, 
            player : msg.color, 
            move : moveResult.split(" ")[1],
            blackWinRate: msg.color.toUpperCase() == "B" ? 1 - (<any>analysis.rootInfo).winrate : ((<any>analysis.rootInfo).winrate), 
            ownerShip: analysis.ownership.map(x=> msg.color.toUpperCase() == "B" ? -x : x )
        };
        var uidsid = [{ uid: session.uid, sid: session.getSid() }];
        this.app.sendMsgByUidSid(cmd, data, uidsid);
        next({sequenceId: msg.sequenceId, result: true });
    }

    async resign(msg: { sequenceId: number, color: number }, session: Session, next: Function) {
        this.engine.resign();
        var cmd = this.app.routeConfig.indexOf("katagoGTP.main.resign");
        var data = {sequenceId: msg.sequenceId, code: 200 };
        var uidsid = [{ uid: session.uid, sid: session.getSid() }];
        this.app.sendMsgByUidSid(cmd, data, uidsid)
    }

    async manualScore(msg: { sequenceId: number, color: number }, session: Session, next: Function) {
        var result = this.engine.final_score;
        var cmd = this.app.routeConfig.indexOf("katagoGTP.main.manualScore");
        var data = {sequenceId: msg.sequenceId, code: 200, result: result };
        var uidsid = [{ uid: session.uid, sid: session.getSid() }];
        this.app.sendMsgByUidSid(cmd, data, uidsid)
    }
}