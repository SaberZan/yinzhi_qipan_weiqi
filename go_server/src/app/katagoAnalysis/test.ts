import { AnalysisEngine } from "./analysisEngine";
import { AI_HUMAN, PLAYER_AI, PLAYER_HUMAN, PLAYING_NORMAL } from "./constants";
import { katagoAnalysis } from "./katagoAnalysis";
import { NodeInfo } from "./nodeInfo";
import { Move, SGFNode } from "./sgfParser";
import config from "./config";

let engine = new AnalysisEngine({ "B": new katagoAnalysis(), "W": new katagoAnalysis() });
engine.updateMoveTreeCall = () => { 
};
engine.updatePondering = (value: boolean) => { 
};
engine.updateState = (updateBoard: boolean) => { 
};
engine.updateMoveTreeInsertNode = (node : SGFNode<NodeInfo> | null) => { 
};
engine.loggerFunction = (level: string, msg: string) => { 
    console.log(level, msg);
};

async function delay(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function Test()
{
    await delay(5);
    
    var gameProperties = {
        SZ : 19,
        KM : 7.5,
        HA : 0,
        RU : "cn"
    }
    await engine.InitEngine({ gameProperties : gameProperties });
    engine.updatePlayer("B", { "playerType" : PLAYER_HUMAN, "playerSubtype" : PLAYING_NORMAL, rank : 8 });
    engine.updatePlayer("W", { "playerType" : PLAYER_AI, "playerSubtype" : AI_HUMAN, rank : 0  });

    
    await delay(3);

    let move = new Move([3, 15], "B");
    let playNode = await engine.play(move);

    console.log("playNode " + playNode.move.gtp() + "   winRate " + playNode.t.winrate);

    playNode.t.lossOwnership;

    let moveResult = await engine.genMove(undefined);

    moveResult[1].t.lossOwnership;

    console.log("moveResult " + moveResult?.[1].move.gtp() + "   winRate " + moveResult?.[1].t.winrate);

}

Test();