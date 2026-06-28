import { NodeInfo } from "../katagoAnalysis/nodeInfo";
import { Move, SGFNode } from "../katagoAnalysis/sgfParser";
import KataGoGTP from "./katagoGTP";

async function Test()
{
    let engine = new KataGoGTP();
    await engine.waitReady();
    await engine.initGame(19, "cn", 6.5, 0);
    // await engine.updateRank(1);

    let playNode1 = await engine.play("B", "Q16");

    let data1 = await engine.getAnalysis();

    let playNode2 = await engine.genMove("W");

    let data2 = await engine.getAnalysis();
}

Test();