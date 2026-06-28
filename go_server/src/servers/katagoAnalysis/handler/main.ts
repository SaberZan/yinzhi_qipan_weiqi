import { send } from "process";
import Application from "../../../../lib/application";
import { Session } from "../../../../lib/components/session"
import { AnalysisEngine } from "../../../app/katagoAnalysis/analysisEngine";
import { katagoAnalysis } from "../../../app/katagoAnalysis/katagoAnalysis";
import { Move, SGFNode } from "../../../app/katagoAnalysis/sgfParser";
import { NodeInfo } from "../../../app/katagoAnalysis/nodeInfo";
import { loggerLevel } from "../../../../lib/util/interfaceDefine";
import { AI_HUMAN, PLAYER_AI, PLAYER_HUMAN, PLAYING_NORMAL } from "../../../app/katagoAnalysis/constants";

export default class Handler {
    app: Application;

    engine: AnalysisEngine;
    constructor(app: Application) {
        this.app = app;
        this.engine = new AnalysisEngine({ "B": new katagoAnalysis(), "W": new katagoAnalysis() });
        this.engine.updateMoveTreeCall = () => { 
        };
        this.engine.updatePondering = (value: boolean) => { 
        };
        this.engine.updateState = (updateBoard: boolean) => { 
        };
        this.engine.updateMoveTreeInsertNode = (node : SGFNode<NodeInfo> | null) => { 
        };
        this.engine.loggerFunction = (level: string, msg: string) => { 
            switch (level) {
                case "debug":
                    this.app.logger("katagoAnalysis", loggerLevel.debug, msg);
                    break;
                case "info":
                    this.app.logger("katagoAnalysis", loggerLevel.info, msg);
                    break;
                case "error":
                    this.app.logger("katagoAnalysis", loggerLevel.error, msg);
            }
        };
    }

    async initGame(msg: { sequenceId: number, size: number, rule: string, komi: number, handicap: number, rank: number,  player: string }, session: Session, next: Function) {
        var gameProperties = {
            SZ : msg.size,
            KM : msg.komi,
            HA : msg.handicap,
            RU : msg.rule
        }
        await this.engine.InitEngine({ gameProperties : gameProperties });
        this.engine.updatePlayer(msg.player, { playerType : PLAYER_HUMAN, playerSubtype : PLAYING_NORMAL, rank: undefined });
        this.engine.updatePlayer(msg.player == "B" ? "W" : "B", { playerType : PLAYER_AI, playerSubtype : AI_HUMAN, rank: msg.rank});
        var cmd = this.app.routeConfig.indexOf("katagoAnalysis.main.initGame");
        var data = {sequenceId: msg.sequenceId, code: 200 };
        var uidsid = [{ uid: session.uid, sid: session.getSid() }];
        this.app.sendMsgByUidSid(cmd, data, uidsid);
    }

    async play(msg: { sequenceId: number, color: string, gtp: string }, session: Session, next: Function) {
        let move = Move.fromGtp(msg.gtp, msg.color.toUpperCase());

        console.log("play msg ", JSON.stringify(msg), move.player,  move.gtp());
        let playedNode = await this.engine.play(move);
        var cmd = this.app.routeConfig.indexOf("katagoAnalysis.main.play");
        var data = {sequenceId: msg.sequenceId, code: 200, blackWinRate: playedNode.t.winrate, ownerShip: playedNode.t.ownership };
        var uidsid = [{ uid: session.uid, sid: session.getSid() }];
        this.app.sendMsgByUidSid(cmd, data, uidsid);
    }

    async genMove(msg: { sequenceId: number, color: number }, session: Session, next: Function) {
        let moveResult = await this.engine.genMove(undefined);
        let [move, playedNode] = [undefined, undefined]; 
        if(moveResult != undefined) {
            [move, playedNode] = moveResult;
        }
        var cmd = this.app.routeConfig.indexOf("katagoAnalysis.main.genMove");
        var data = { 
            sequenceId: msg.sequenceId, 
            code: moveResult != undefined ? 200 : 1, 
            player : move?.player, 
            move : move?.gtp(),
            blackWinRate: playedNode?.t.winrate, 
            ownerShip: playedNode?.t.ownership
        };
        var uidsid = [{ uid: session.uid, sid: session.getSid() }];
        this.app.sendMsgByUidSid(cmd, data, uidsid);
    }

    async resign(msg: { sequenceId: number, color: number }, session: Session, next: Function) {
        this.engine.resign();
        var cmd = this.app.routeConfig.indexOf("katagoAnalysis.main.resign");
        var data = {sequenceId: msg.sequenceId, code: 200 };
        var uidsid = [{ uid: session.uid, sid: session.getSid() }];
        this.app.sendMsgByUidSid(cmd, data, uidsid)
    }

    async manualScore(msg: { sequenceId: number, color: number }, session: Session, next: Function) {
        var result = this.engine.manualScore;
        var cmd = this.app.routeConfig.indexOf("katagoAnalysis.main.manualScore");
        var data = {sequenceId: msg.sequenceId, code: 200, result: result };
        var uidsid = [{ uid: session.uid, sid: session.getSid() }];
        this.app.sendMsgByUidSid(cmd, data, uidsid)
    }
}