// ai.ts
import { Move, SGFNode } from './sgfParser';
import { NodeInfo } from './nodeInfo';
import { AnalysisEngine } from './analysisEngine'; // This would need to be implemented
import {
    AI_DEFAULT, AI_HANDICAP, AI_INFLUENCE, AI_JIGO,
    AI_ANTIMIRROR, AI_LOCAL, AI_PICK, AI_POLICY, AI_RANK, AI_SCORELOSS,
    AI_SETTLE_STONES, AI_SIMPLE_OWNERSHIP, AI_STRENGTH,
    AI_TENUKI, AI_TERRITORY, AI_WEIGHTED, CALIBRATED_RANK_ELO,
    OUTPUT_DEBUG, OUTPUT_ERROR, OUTPUT_INFO, PRIORITY_EXTRA_AI_QUERY,
    ADDITIONAL_MOVE_ORDER, AI_HUMAN, AI_PRO,
    AI_WEIGHTED_ELO, AI_SCORELOSS_ELO,
    AI_LOCAL_ELO_GRID, AI_TENUKI_ELO_GRID, AI_TERRITORY_ELO_GRID,
    AI_INFLUENCE_ELO_GRID, AI_PICK_ELO_GRID
} from './constants';
import { weightedSelectionWithoutReplacement, varToGrid, evaluationClass } from './utils';

// Decorator pattern for adding classes to the registry
export const STRATEGY_REGISTRY: Record<string, new (engine: AnalysisEngine, aiSettings: Record<string, any>) => {} extends AIStrategy ? AIStrategy : any> = {};

const registerStrategy = (strategyName: string) => {
    return (constructor: new (engine: AnalysisEngine, aiSettings: Record<string, any>) => ({} extends AIStrategy ? AIStrategy : any)) => {
        STRATEGY_REGISTRY[strategyName] = constructor;
    };
};

const interpIx = (lst: number[][], x: number): [number, number] => {
    if (lst.length <= 1) {
        return [0, 0];
    }
    
    let i = 0;
    while (i + 1 < lst.length && lst[i + 1][0] < x) {
        i += 1;
    }
    
    if (i >= lst.length - 1) {
        return [lst.length - 2, 1];
    }
    
    const t = Math.max(0, Math.min(1, (x - lst[i][0]) / (lst[i + 1][0] - lst[i][0])));
    return [i, t];
};

const interp1d = (lst: number[][], x: number): number => {
    const [xs, ys] = [lst.map(item => item[0]), lst.map(item => item[1])];
    const [i, t] = interpIx(lst, x);
    return (1 - t) * ys[i] + t * ys[i + 1];
};

const interp2d = (gridspec: [number[], number[], number[][]], x: number, y: number): number => {
    const [xs, ys, matrix] = gridspec;
    const [i, t] = interpIx(xs.map((v, idx) => [v, idx]), x);
    const [j, s] = interpIx(ys.map((v, idx) => [v, idx]), y);
    return (
        matrix[j][i] * (1 - t) * (1 - s)
        + matrix[j][i + 1] * t * (1 - s)
        + matrix[j + 1][i] * (1 - t) * s
        + matrix[j + 1][i + 1] * t * s
    );
};

export const aiRankEstimation = (strategy: string, settings: Record<string, any>): number => {
    if ([AI_DEFAULT, AI_HANDICAP, AI_JIGO, AI_PRO].includes(strategy)) {
        return 9;
    }
    if (strategy === AI_RANK) {
        return 1 - settings.kyuRank;
    }
    if (strategy === AI_HUMAN) {
        return 1 - settings.humanKyuRank;
    }

    if ([AI_WEIGHTED, AI_SCORELOSS, AI_LOCAL, AI_TENUKI, AI_TERRITORY, AI_INFLUENCE, AI_PICK].includes(strategy)) {
        let elo: number;
        if (strategy === AI_WEIGHTED) {
            elo = interp1d(AI_WEIGHTED_ELO, settings.weakenFac);
        } else if (strategy === AI_SCORELOSS) {
            elo = interp1d(AI_SCORELOSS_ELO, settings.strength);
        } else if (strategy === AI_PICK) {
            elo = interp2d(AI_PICK_ELO_GRID, settings.pickFrac, settings.pickN);
        } else if (strategy === AI_LOCAL) {
            elo = interp2d(AI_LOCAL_ELO_GRID, settings.pickFrac, settings.pickN);
        } else if (strategy === AI_TENUKI) {
            elo = interp2d(AI_TENUKI_ELO_GRID, settings.pickFrac, settings.pickN);
        } else if (strategy === AI_TERRITORY) {
            elo = interp2d(AI_TERRITORY_ELO_GRID, settings.pickFrac, settings.pickN);
        } else if (strategy === AI_INFLUENCE) {
            elo = interp2d(AI_INFLUENCE_ELO_GRID, settings.pickFrac, settings.pickN);
        } else {
            elo = 0; // Should not happen
        }

        const kyu = interp1d(CALIBRATED_RANK_ELO, elo);
        return 1 - kyu;
    } else {
        return AI_STRENGTH[strategy] || 0;
    }
};

export const gameReport = (
    engine: AnalysisEngine,
    thresholds: number[],
    depthFilter: [number, number] | null = null
): [Record<string, any>, Record<string, number>[], Record<string, number[]>] => {
    let cn = engine.currentNode;
    const nodes: SGFNode<NodeInfo>[] = <SGFNode<NodeInfo>[]>[...cn?.nodesFromRoot ?? []];
    while (cn?.children.length ?? 0 > 0) { // main branch
        cn = <SGFNode<NodeInfo>>cn?.children[0];
        nodes.push(cn);
    }

    const [x, y] = engine.boardSize;
    const depthFilterActual = depthFilter || [0, 1e9];
    const filteredNodes = nodes.filter(n =>
        n.move && !n.isRoot &&
        depthFilterActual[0] <= (n.depth ?? 0) && (n.depth ?? 0) < depthFilterActual[1]
    );

    const histogram = thresholds.map(() => ({ "B": 0, "W": 0 }));
    const aiTopMoveCount = { "B": 0, "W": 0 };
    const aiApprovedMoveCount = { "B": 0, "W": 0 };
    const playerPtloss = { "B": [] as number[], "W": [] as number[] };
    const weights = { "B": [] as [number, number][], "W": [] as [number, number][] };

    for (const n of filteredNodes) {
        let pointsLost = n.t.pointsLost;
        if (pointsLost === null || pointsLost === undefined) {
            continue;
        } else {
            pointsLost = Math.max(0, pointsLost);
        }

        const bucket = thresholds.length - 1 - evaluationClass(pointsLost, thresholds);
        playerPtloss[n.player].push(pointsLost);
        histogram[bucket][n.player] += 1;


        const cands = n.parent?.t.candidateMoves ?? [];
        const filteredCands = cands.filter((d: any) =>
            d && typeof d === 'object' && "order" in d && d.order < ADDITIONAL_MOVE_ORDER && "prior" in d
        );

        const weight = Math.min(
            1.0,
            filteredCands.reduce((sum, d) => sum + Math.max(d.pointsLost, 0) * d.prior, 0) /
            (filteredCands.reduce((sum, d) => sum + d.prior, 0) || 1e-6),
        ); // complexity capped at 1

        // adj_weight between 0.05 - 1, dependent on difficulty and points lost
        const adjWeight = Math.max(0.05, Math.min(1.0, Math.max(weight, pointsLost / 4)));
        weights[n.player].push([weight, adjWeight]);

        if (n.parent?.t.analysisComplete) {
            aiTopMoveCount[n.player] += (cands[0].move === n.move?.gtp()) ? 1 : 0;
            aiApprovedMoveCount[n.player] += (
                filteredCands.some((d: any) =>
                    d.move === n.move?.gtp() && (d.order === 0 || (d.pointsLost < 0.5 && d.order < 5))
                )
            ) ? 1 : 0;
        }
    }

    const wtLoss = {
        "B": playerPtloss.B.reduce((sum, s, i) =>
            sum + s * weights.B[i][1], 0) /
            (weights.B.reduce((sum, [, aw]) => sum + aw, 0) || 1e-6),
        "W": playerPtloss.W.reduce((sum, s, i) =>
            sum + s * weights.W[i][1], 0) /
            (weights.W.reduce((sum, [, aw]) => sum + aw, 0) || 1e-6)
    };

    const sumStats = {
        "B": playerPtloss.B.length > 0 ? {
            "accuracy": 100 * Math.pow(0.75, wtLoss.B),
            "complexity": weights.B.reduce((sum, [w]) => sum + w, 0) / playerPtloss.B.length,
            "mean_ptloss": playerPtloss.B.reduce((sum, s) => sum + s, 0) / playerPtloss.B.length,
            "weighted_ptloss": wtLoss.B,
            "ai_top_move": aiTopMoveCount.B / playerPtloss.B.length,
            "ai_top5_move": aiApprovedMoveCount.B / playerPtloss.B.length,
        } : {},
        "W": playerPtloss.W.length > 0 ? {
            "accuracy": 100 * Math.pow(0.75, wtLoss.W),
            "complexity": weights.W.reduce((sum, [w]) => sum + w, 0) / playerPtloss.W.length,
            "mean_ptloss": playerPtloss.W.reduce((sum, s) => sum + s, 0) / playerPtloss.W.length,
            "weighted_ptloss": wtLoss.W,
            "ai_top_move": aiTopMoveCount.W / playerPtloss.W.length,
            "ai_top5_move": aiApprovedMoveCount.W / playerPtloss.W.length,
        } : {}
    };

    return [sumStats, histogram, playerPtloss];
};

const fmtMoves = (moves: [number, Move][]): string => {
    return moves.map(([p, mv]) => `${mv.gtp()} (${(p * 100).toFixed(2)}%)`).join(", ");
};

// Utility functions from the original code
const policyWeightedMove = (
    policyMoves: [number, Move][],
    lowerBound: number,
    weakenFac: number
): [Move, string] => {
    const lowerBoundActual = Math.max(0, lowerBound);
    const weakenFacActual = Math.max(0.01, weakenFac);

    const weightedCoords = policyMoves
        .filter(([pv, move]) => pv > lowerBoundActual && !move.isPass)
        .map(([pv, move]) => [pv, Math.pow(pv, 1 / weakenFacActual), move] as [number, number, Move]);

    if (weightedCoords.length > 0) {
        const top = weightedSelectionWithoutReplacement(weightedCoords, 1)[0];
        const move = top[2] as Move;
        const aiThoughts = `Playing policy-weighted random move ${move.gtp()} (${(top[0] * 100).toFixed(1)}%) from ${weightedCoords.length} moves above lowerBound of ${(lowerBoundActual * 100).toFixed(2)}%.`;
        return [move, aiThoughts];
    } else {
        const move = policyMoves[0][1];
        const aiThoughts = `Playing top policy move because no non-pass move > above lowerBound of ${(lowerBoundActual * 100).toFixed(2)}%.`;
        return [move, aiThoughts];
    }
};

const generateInfluenceTerritoryWeights = (
    aiMode: string,
    aiSettings: Record<string, any>,
    policyGrid: number[][],
    size: [number, number]
): [[number, number, number, number][], string] => {
    const thrLine = aiSettings["threshold"] - 1; // zero-based

    let weightFunc: (x: number, y: number) => number;
    if (aiMode === "ai:p:influence") {
        weightFunc = (x: number, y: number): number => {
            const weightFactor = 1 / aiSettings.lineWeight;
            const distX = Math.max(0, thrLine - Math.min(size[0] - 1 - x, x));
            const distY = Math.max(0, thrLine - Math.min(size[1] - 1 - y, y));
            return Math.pow(weightFactor, distX + distY);
        };
    } else {
        weightFunc = (x: number, y: number): number => {
            const weightFactor = 1 / aiSettings.lineWeight;
            const dist = Math.max(0, Math.min(size[0] - 1 - x, x, size[1] - 1 - y, y) - thrLine);
            return Math.pow(weightFactor, dist);
        };
    }

    const weightedCoords: [number, number, number, number][] = [];
    for (let x = 0; x < size[0]; x++) {
        for (let y = 0; y < size[1]; y++) {
            if (policyGrid[y][x] > 0) {
                const weight = weightFunc(x, y);
                weightedCoords.push([policyGrid[y][x] * weight, weight, x, y]);
            }
        }
    }

    const aiThoughts = `Generated weights for ${aiMode} according to weight factor ${aiSettings.lineWeight} and distance from ${thrLine + 1}th line. `;
    return [weightedCoords, aiThoughts];
};

const generateLocalTenukiWeights = (
    aiMode: string,
    aiSettings: Record<string, any>,
    policyGrid: number[][],
    cn: SGFNode<NodeInfo>,
    size: [number, number]
): [[number, number, number, number][], string] => {
    if (!cn.move || !cn.move.coords) {
        return [[], "No previous move to base weights on."];
    }

    const varValue = Math.pow(aiSettings["stddev"], 2);
    const [mx, my] = cn.move.coords;

    const weightedCoords: [number, number, number, number][] = [];
    for (let x = 0; x < size[0]; x++) {
        for (let y = 0; y < size[1]; y++) {
            if (policyGrid[y][x] > 0) {
                const distance = Math.pow(x - mx, 2) + Math.pow(y - my, 2);
                const weight = Math.exp(-0.5 * distance / varValue);
                weightedCoords.push([policyGrid[y][x], weight, x, y]);
            }
        }
    }

    let aiThoughts = `Generated weights based on gaussian with variance ${varValue} around coordinates ${mx},${my}. `;
    if (aiMode === "ai:p:tenuki") {
        // For tenuki, invert the weights
        const invertedCoords = weightedCoords.map(([p, w, x, y]) => [p, 1 - w, x, y] as [number, number, number, number]);
        aiThoughts = `Generated weights based on one minus gaussian with variance ${varValue} around coordinates ${mx},${my}. `;
        return [invertedCoords, aiThoughts];
    }

    return [weightedCoords, aiThoughts];
};

export abstract class AIStrategy {
    engine: AnalysisEngine;
    settings: Record<string, any>;
    cn: SGFNode<NodeInfo> | undefined = undefined;
    strategyName: string;

    constructor(engine: AnalysisEngine, aiSettings: Record<string, any>) {
        this.engine = engine;
        this.settings = aiSettings;
        this.cn = engine.currentNode;
        this.strategyName = this.constructor.name;
        this.engine.consoleLog(`Initializing ${this.strategyName} with settings: ${JSON.stringify(this.settings)}`, OUTPUT_DEBUG);
    }

    abstract generateMove(): Promise<[Move, string]>;

    requestAnalysis(extraSettings: Record<string, any>): Promise<any> {
        this.engine.consoleLog(`[${this.strategyName}] Requesting analysis with settings: ${JSON.stringify(extraSettings)}`, OUTPUT_DEBUG);

        return new Promise((resolve, reject) => {
            let error = false;
            let analysis: any = null;

            const setAnalysis = (a: any, partialResult: boolean) => {
                if (!partialResult) {
                    analysis = a;
                    this.engine.consoleLog(`[${this.strategyName}] Analysis received`, OUTPUT_DEBUG);
                }
            };

            const setError = (a: any) => {
                error = true;
                this.engine.consoleLog(`[${this.strategyName}] Error in additional analysis query: ${a}`, OUTPUT_ERROR);
            };

            const engine = this.engine.engines[this.cn!.player];
            engine.requestAnalysis(
                {
                    node: this.cn!,
                    callback: setAnalysis,
                    errorCallback: setError,
                    priority: PRIORITY_EXTRA_AI_QUERY,
                    extraSettings: extraSettings,
                    includePolicy: true,
                }
            );

            // Poll for completion
            const checkCompletion = () => {
                if (error) {
                    reject(new Error("Analysis error"));
                } else if (analysis) {
                    resolve(analysis);
                } else {
                    setTimeout(checkCompletion, 10);
                }
            };

            checkCompletion();
        });
    }

    shouldPlayTopMove(
        policyMoves: [number, Move][],
        top5Pass: boolean,
        override: number = 0.0,
        overridetwo: number = 1.0
    ): [Move | null, string] {
        const topPolicyMove = policyMoves[0][1];
        this.engine.consoleLog(`[${this.strategyName}] Checking if should play top move. Top move: ${topPolicyMove.gtp()} (${(policyMoves[0][0] * 100).toFixed(2)}%)`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[${this.strategyName}] Override thresholds: single=${(override * 100).toFixed(2)}%, combined=${(overridetwo * 100).toFixed(2)}%`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[${this.strategyName}] Top 5 pass: ${top5Pass}`, OUTPUT_DEBUG);

        if (top5Pass) {
            this.engine.consoleLog(`[${this.strategyName}] Playing top move because pass is in top 5`, OUTPUT_DEBUG);
            return [topPolicyMove, "Playing top one because one of them is pass."];
        }

        if (policyMoves[0][0] > override) {
            this.engine.consoleLog(`[${this.strategyName}] Playing top move because weight ${(policyMoves[0][0] * 100).toFixed(2)}% > override ${(override * 100).toFixed(2)}%`, OUTPUT_DEBUG);
            return [topPolicyMove, `Top policy move has weight > ${(override * 100).toFixed(1)}%, so overriding other strategies.`];
        }

        if (policyMoves[0][0] + policyMoves[1][0] > overridetwo) {
            const combined = policyMoves[0][0] + policyMoves[1][0];
            this.engine.consoleLog(`[${this.strategyName}] Playing top move because combined weight ${(combined * 100).toFixed(2)}% > overridetwo ${(overridetwo * 100).toFixed(2)}%`, OUTPUT_DEBUG);
            return [topPolicyMove, `Top two policy moves have cumulative weight > ${(overridetwo * 100).toFixed(1)}%, so overriding other strategies.`];
        }

        this.engine.consoleLog(`[${this.strategyName}] No override condition met, continuing with strategy`, OUTPUT_DEBUG);
        return [null, ""];
    }
}

@registerStrategy(AI_DEFAULT)
export class DefaultStrategy extends AIStrategy {
    async generateMove(): Promise<[Move, string]> {
        this.engine.consoleLog(`[DefaultStrategy] Starting move generation`, OUTPUT_DEBUG);
        await this.cn.t.waitForAnalysis(this.strategyName);

        const candidateMoves = this.cn!.t.candidateMoves;
        this.engine.consoleLog(`[DefaultStrategy] Analysis found ${candidateMoves.length} candidate moves`, OUTPUT_DEBUG);

        let topCand: Move;
        if (candidateMoves.length === 0) {
            this.engine.consoleLog(`[DefaultStrategy] No candidate moves found, will play pass`, OUTPUT_DEBUG);
            topCand = new Move(null, this.cn!.nextPlayer);
        } else {
            const topMoveData = candidateMoves[0];
            topCand = Move.fromGtp(topMoveData.move, this.cn!.nextPlayer);
            this.engine.consoleLog(`[DefaultStrategy] Top move: ${topCand.gtp()} with stats: ${JSON.stringify(topMoveData)}`, OUTPUT_DEBUG);
        }

        const aiThoughts = `Default strategy found ${candidateMoves.length} moves returned from the engine and chose ${topCand.gtp()} as top move`;
        this.engine.consoleLog(`[DefaultStrategy] Final decision: ${topCand.gtp()}`, OUTPUT_DEBUG);

        return [topCand, aiThoughts];
    }
}

@registerStrategy(AI_HANDICAP)
export class HandicapStrategy extends AIStrategy {
    async generateMove(): Promise<[Move, string]> {
        this.engine.consoleLog(`[HandicapStrategy] Starting move generation`, OUTPUT_DEBUG);

        // Calculate PDA (Playout Doubling Advantage)
        let pda = this.settings["pda"];
        this.engine.consoleLog(`[HandicapStrategy] Initial PDA from settings: ${pda}`, OUTPUT_DEBUG);

        if (this.settings["automatic"]) {
            const nHandicaps = this.engine.root.getListProperty("AB", []).length;
            const MOVE_VALUE = 14; // could be rules dependent
            const bStonesAdvantage = Math.max(nHandicaps - 1, 0) - (this.cn!.komi - MOVE_VALUE / 2) / MOVE_VALUE;
            pda = Math.min(3, Math.max(-3, -bStonesAdvantage * (3 / 8))); // max PDA at 8 stone adv, normal 9 stone game is 8.46

            this.engine.consoleLog(`[HandicapStrategy] Automatic PDA calculation:`, OUTPUT_DEBUG);
            this.engine.consoleLog(`[HandicapStrategy] - Handicap stones: ${nHandicaps}`, OUTPUT_DEBUG);
            this.engine.consoleLog(`[HandicapStrategy] - Komi: ${this.cn!.komi}`, OUTPUT_DEBUG);
            this.engine.consoleLog(`[HandicapStrategy] - Stone advantage: ${bStonesAdvantage}`, OUTPUT_DEBUG);
            this.engine.consoleLog(`[HandicapStrategy] - Calculated PDA: ${pda}`, OUTPUT_DEBUG);
        }

        // Request additional analysis with PDA
        this.engine.consoleLog(`[HandicapStrategy] Requesting analysis with PDA=${pda}`, OUTPUT_DEBUG);
        let handicapAnalysis;
        try {
            handicapAnalysis = await this.requestAnalysis({
                "playoutDoublingAdvantage": pda,
                "playoutDoublingAdvantagePla": "BLACK"
            });
        } catch (e) {
            this.engine.consoleLog("[HandicapStrategy] Error getting handicap-based move, falling back to DefaultStrategy", OUTPUT_ERROR);
            return new DefaultStrategy(this.engine, this.settings).generateMove();
        }

        await this.cn.t.waitForAnalysis(this.strategyName);

        const candidateMoves = handicapAnalysis.moveInfos;
        this.engine.consoleLog(`[HandicapStrategy] Analysis returned ${candidateMoves.length} candidate moves`, OUTPUT_DEBUG);

        // Get top candidate move
        const topMoveData = candidateMoves[0];
        const topCand = Move.fromGtp(topMoveData.move, this.cn!.nextPlayer);

        // Log details about the top move
        this.engine.consoleLog(`[HandicapStrategy] Top move: ${topCand.gtp()}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[HandicapStrategy] Score lead: ${handicapAnalysis.rootInfo.scoreLead}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[HandicapStrategy] Win rate: ${handicapAnalysis.rootInfo.winrate}`, OUTPUT_DEBUG);

        const aiThoughts = `Handicap strategy found ${candidateMoves.length} moves returned from the engine and chose ${topCand.gtp()} as top move. PDA based score ${this.cn!.t.formatScore(handicapAnalysis.rootInfo.scoreLead)} and win rate ${this.cn!.t.formatWinrate(handicapAnalysis.rootInfo.winrate)}`;

        this.engine.consoleLog(`[HandicapStrategy] Final decision: ${topCand.gtp()}`, OUTPUT_DEBUG);
        return [topCand, aiThoughts];
    }
}

@registerStrategy(AI_ANTIMIRROR)
export class AntimirrorStrategy extends AIStrategy {
    async generateMove(): Promise<[Move, string]> {
        this.engine.consoleLog(`[AntimirrorStrategy] Starting move generation`, OUTPUT_DEBUG);

        // Request analysis with antimirror option
        this.engine.consoleLog(`[AntimirrorStrategy] Requesting analysis with antiMirror=true`, OUTPUT_DEBUG);
        let antimirrorAnalysis;
        try {
            antimirrorAnalysis = await this.requestAnalysis({ "antiMirror": true });
        } catch (e) {
            this.engine.consoleLog("[AntimirrorStrategy] Error getting antimirror move, falling back to DefaultStrategy", OUTPUT_ERROR);
            return new DefaultStrategy(this.engine, this.settings).generateMove();
        }

        await this.cn.t.waitForAnalysis(this.strategyName);

        const candidateMoves = antimirrorAnalysis.moveInfos;
        this.engine.consoleLog(`[AntimirrorStrategy] Analysis returned ${candidateMoves.length} candidate moves`, OUTPUT_DEBUG);

        // Get top candidate move
        const topMoveData = candidateMoves[0];
        const topCand = Move.fromGtp(topMoveData.move, this.cn!.nextPlayer);

        // Log details about the top move
        this.engine.consoleLog(`[AntimirrorStrategy] Top move: ${topCand.gtp()}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[AntimirrorStrategy] Score lead: ${antimirrorAnalysis.rootInfo.scoreLead}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[AntimirrorStrategy] Win rate: ${antimirrorAnalysis.rootInfo.winrate}`, OUTPUT_DEBUG);

        // Log the top 3 moves for comparison
        for (let i = 0; i < Math.min(3, candidateMoves.length); i++) {
            const moveData = candidateMoves[i];
            const move = Move.fromGtp(moveData.move, this.cn!.nextPlayer);
            this.engine.consoleLog(`[AntimirrorStrategy] Move #${i + 1}: ${move.gtp()} - visits: ${moveData.visits || 'N/A'}, points lost: ${moveData.pointsLost || 'N/A'}`, OUTPUT_DEBUG);
        }

        const aiThoughts = `AntiMirror strategy found ${candidateMoves.length} moves returned from the engine and chose ${topCand.gtp()} as top move. antiMirror based score ${this.cn!.t.formatScore(antimirrorAnalysis.rootInfo.scoreLead)} and win rate ${this.cn!.t.formatWinrate(antimirrorAnalysis.rootInfo.winrate)}`;

        this.engine.consoleLog(`[AntimirrorStrategy] Final decision: ${topCand.gtp()}`, OUTPUT_DEBUG);
        return [topCand, aiThoughts];
    }
}

@registerStrategy(AI_JIGO)
export class JigoStrategy extends AIStrategy {

    async generateMove(): Promise<[Move, string]> {
        this.engine.consoleLog("[JigoStrategy] Starting move generation", OUTPUT_DEBUG);
        await this.cn.t.waitForAnalysis(this.strategyName);

        const candidateMoves: { [key: string]: any }[] = this.cn!.t.candidateMoves;
        this.engine.consoleLog(`[JigoStrategy] Analysis found ${candidateMoves.length} candidate moves`, OUTPUT_DEBUG);

        if (!candidateMoves || candidateMoves.length === 0) {
            this.engine.consoleLog("[JigoStrategy] No candidate moves found, will play pass", OUTPUT_DEBUG);
            return [new Move(null, this.cn!.nextPlayer), "No candidate moves found, passing"];
        }

        // Get top engine move for reference
        const topCand = Move.fromGtp(candidateMoves[0]["move"], this.cn!.nextPlayer);
        this.engine.consoleLog(`[JigoStrategy] Top engine move would be: ${topCand.gtp()}`, OUTPUT_DEBUG);

        // Calculate player sign (1 for black, -1 for white)
        const sign = NodeInfo.playerSign(this.cn!.nextPlayer);
        this.engine.consoleLog(`[JigoStrategy] Player sign: ${sign}`, OUTPUT_DEBUG);

        // Get target score from settings
        const targetScore = this.settings.targetScore;
        this.engine.consoleLog(`[JigoStrategy] Target score: ${targetScore}`, OUTPUT_DEBUG);

        // Log score leads before selecting jigo move
        this.engine.consoleLog("[JigoStrategy] Candidate move score leads:", OUTPUT_DEBUG);
        for (let i = 0; i < Math.min(5, candidateMoves.length); i++) {
            const moveData = candidateMoves[i];
            const move = Move.fromGtp(moveData["move"], this.cn!.nextPlayer);
            const scoreDiff = Math.abs(sign * moveData["scoreLead"] - targetScore);
            this.engine.consoleLog(`[JigoStrategy] - ${move.gtp()}: scoreLead=${moveData['scoreLead']}, diff from target=${scoreDiff}`, OUTPUT_DEBUG);
        }

        // Find the move that gives a score closest to the target
        const jigoMove = candidateMoves.reduce((prev, current) => {
            const prevDiff = Math.abs(sign * prev.scoreLead - targetScore);
            const currentDiff = Math.abs(sign * current.scoreLead - targetScore);
            return prevDiff < currentDiff ? prev : current;
        });

        const aimove = Move.fromGtp(jigoMove["move"], this.cn!.nextPlayer);
        const jigoScoreDiff = Math.abs(sign * jigoMove["scoreLead"] - targetScore);

        this.engine.consoleLog(`[JigoStrategy] Selected move: ${aimove.gtp()}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[JigoStrategy] Selected move score lead: ${jigoMove['scoreLead']}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[JigoStrategy] Distance from target: ${jigoScoreDiff}`, OUTPUT_DEBUG);

        const aiThoughts = `Jigo strategy found ${candidateMoves.length} candidate moves (best ${topCand.gtp()}) and chose ${aimove.gtp()} as closest to 0.5 point win`;

        this.engine.consoleLog(`[JigoStrategy] Final decision: ${aimove.gtp()}`, OUTPUT_DEBUG);
        return [aimove, aiThoughts];
    }
}

@registerStrategy(AI_SCORELOSS)
export class ScoreLossStrategy extends AIStrategy {
    constructor(engine: AnalysisEngine, aiSettings: Record<string, any>) {
        super(engine, aiSettings);
    }

    async generateMove(): Promise<[Move, string]> {
        this.engine.consoleLog(`[ScoreLossStrategy] Starting move generation`, OUTPUT_DEBUG);
        await this.cn.t.waitForAnalysis(this.strategyName);

        const candidateMoves = this.cn!.t.candidateMoves;
        this.engine.consoleLog(`[ScoreLossStrategy] Analysis found ${candidateMoves.length} candidate moves`, OUTPUT_DEBUG);

        if (!candidateMoves || candidateMoves.length === 0) {
            this.engine.consoleLog(`[ScoreLossStrategy] No candidate moves found, will play pass`, OUTPUT_DEBUG);
            return [new Move(null, this.cn!.nextPlayer), "No candidate moves found, passing"];
        }

        const topCand = Move.fromGtp(candidateMoves[0]["move"], this.cn!.nextPlayer);
        this.engine.consoleLog(`[ScoreLossStrategy] Top engine move would be: ${topCand.gtp()}`, OUTPUT_DEBUG);

        // Check if top move is pass
        if (topCand.isPass) {
            this.engine.consoleLog(`[ScoreLossStrategy] Top move is pass, so passing regardless of strategy`, OUTPUT_DEBUG);
            return [topCand, "Top move is pass, so passing regardless of strategy."];
        }

        // Get strength parameter
        const c = this.settings["strength"];
        this.engine.consoleLog(`[ScoreLossStrategy] Strength parameter: ${c}`, OUTPUT_DEBUG);

        // Calculate weights for moves based on point loss
        this.engine.consoleLog(`[ScoreLossStrategy] Calculating weights for candidate moves`, OUTPUT_DEBUG);

        const moves: [number, number, Move][] = [];
        for (let i = 0; i < candidateMoves.length; i++) {
            const d = candidateMoves[i];
            const move = Move.fromGtp(d["move"], this.cn!.nextPlayer);
            const pointsLost = d["pointsLost"];
            const weight = Math.exp(Math.min(200, -c * Math.max(0, pointsLost)));

            this.engine.consoleLog(`[ScoreLossStrategy] Move ${i + 1}: ${move.gtp()} - Points lost: ${pointsLost.toFixed(2)}, Weight: ${weight.toFixed(6)}`, OUTPUT_DEBUG);
            moves.push([pointsLost, weight, move]);
        }

        // Select move based on weights
        this.engine.consoleLog(`[ScoreLossStrategy] Selecting move with weighted selection`, OUTPUT_DEBUG);
        const topmove = weightedSelectionWithoutReplacement(moves, 1)[0];
        const aimove = topmove[2] as Move;

        this.engine.consoleLog(`[ScoreLossStrategy] Selected move: ${aimove.gtp()}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[ScoreLossStrategy] Selected move points lost: ${topmove[0].toFixed(2)}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[ScoreLossStrategy] Selected move weight: ${topmove[1].toFixed(6)}`, OUTPUT_DEBUG);

        const aiThoughts = `ScoreLoss strategy found ${candidateMoves.length} candidate moves (best ${topCand.gtp()}) and chose ${aimove.gtp()} (weight ${topmove[1].toFixed(3)}, point loss ${topmove[0].toFixed(1)}) based on score weights.`;

        this.engine.consoleLog(`[ScoreLossStrategy] Final decision: ${aimove.gtp()}`, OUTPUT_DEBUG);
        return [aimove, aiThoughts];
    }
}

export class OwnershipBaseStrategy extends AIStrategy {

    constructor(engine: AnalysisEngine, aiSettings: Record<string, any>) {
        super(engine, aiSettings);
    }

    async generateMove(): Promise<[Move, string]> {
        return [new Move(null, this.cn!.nextPlayer), "No candidate moves found, passing"];
    }

    /**
     * Calculate settledness for Simple Ownership strategy
     */
    settledness(d: any, playerSign: number, player: string): number {
        const ownershipSum = d["ownership"]
            .filter((o: number) => playerSign * o > 0)
            .reduce((sum: number, o: number) => sum + Math.abs(o), 0);

        this.engine.consoleLog(`[${this.strategyName}] Calculating settledness for ${player}, sign=${playerSign}: ${ownershipSum.toFixed(2)}`, OUTPUT_DEBUG);
        return ownershipSum;
    }

    /**
     * Check if a move is an attachment
     */
    isAttachment(move: Move): boolean {
        if (move.isPass) {
            return false;
        }

        const stonesWithPlayer = new Set(
            this.engine.stones.map((s: Move) => `${s.coords[0]},${s.coords[1]},${s.player}`)
        );

        let attachOpponentStones = 0;
        for (let dx of [-1, 0, 1]) {
            for (let dy of [-1, 0, 1]) {
                if (Math.abs(dx) + Math.abs(dy) === 1) {
                    const key = `${move.coords[0] + dx},${move.coords[1] + dy},${this.cn!.player}`;
                    if (stonesWithPlayer.has(key)) {
                        attachOpponentStones++;
                    }
                }
            }
        }

        let nearbyOwnStones = 0;
        for (let dx of [-2, -1, 0, 1, 2]) {
            for (let dy of [-3, -2, -1, 0, 1, 2]) {
                if (Math.abs(dx) + Math.abs(dy) <= 2) { // allows clamps/jumps
                    const key = `${move.coords[0] + dx},${move.coords[1] + dy},${this.cn!.nextPlayer}`;
                    if (stonesWithPlayer.has(key)) {
                        nearbyOwnStones++;
                    }
                }
            }
        }

        const isAttach = attachOpponentStones >= 1 && nearbyOwnStones === 0;
        this.engine.consoleLog(`[${this.strategyName}] Is move ${move.gtp()} an attachment? ${isAttach} (opponent stones: ${attachOpponentStones}, own stones: ${nearbyOwnStones})`, OUTPUT_DEBUG);
        return isAttach;
    }

    /**
     * Check if a move is a tenuki (far from previous moves)
     */
    isTenuki(move: Move): boolean {
        if (move.isPass) {
            return false;
        }

        const nodesToCheck = [this.cn, this.cn!.parent];
        let result = true;
        const distances: number[] = [];

        for (const node of nodesToCheck) {
            if (!node || !node.move || node.move.isPass) {
                continue;
            }

            const dist = Math.max(
                ...node.move.coords.map((coord: number, i: number) =>
                    Math.abs(coord - move.coords[i])
                )
            );

            distances.push(dist);
            if (dist < 5) {
                result = false;
            }
        }

        if (distances.length > 0) {
            this.engine.consoleLog(`[${this.strategyName}] Is move ${move.gtp()} a tenuki? ${result} (distances: ${distances.join(', ')})`, OUTPUT_DEBUG);
        } else {
            this.engine.consoleLog(`[${this.strategyName}] Is move ${move.gtp()} a tenuki? ${result} (no valid previous moves)`, OUTPUT_DEBUG);
        }

        return result;
    }

    /**
     * Get moves with ownership and settledness information
     */
    getMovesWithSettledness(): [Move, number, number, boolean, boolean, any][] {
        this.engine.consoleLog(`[${this.strategyName}] Getting moves with settledness information`, OUTPUT_DEBUG);

        const nextPlayerSign = NodeInfo.playerSign(this.cn!.nextPlayer);
        const candidateMoves = this.cn!.t.candidateMoves;

        this.engine.consoleLog(`[${this.strategyName}] Processing ${candidateMoves.length} candidate moves`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[${this.strategyName}] Settings: maxPointsLost=${this.settings.maxPointsLost}, minVisits=${this.settings.minVisits || 1}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[${this.strategyName}] Penalties: attach=${this.settings.attachPenalty}, tenuki=${this.settings.tenukiPenalty}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[${this.strategyName}] Weights: settled=${this.settings.settledWeight}, opponentFac=${this.settings.opponentFac}`, OUTPUT_DEBUG);

        const movesData: [Move, number, number, boolean, boolean, any, number][] = [];

        for (const d of candidateMoves) {
            // Check basic filtering conditions
            if (!("pointsLost" in d)) {
                this.engine.consoleLog(`[${this.strategyName}] Move ${d['move']} has no pointsLost, skipping`, OUTPUT_DEBUG);
                continue;
            }

            if (d["pointsLost"] >= this.settings.maxPointsLost) {
                this.engine.consoleLog(`[${this.strategyName}] Move ${d['move']} has pointsLost=${d['pointsLost']}, which exceeds maxPointsLost=${this.settings.maxPointsLost}, skipping`, OUTPUT_DEBUG);
                continue;
            }

            if (!("ownership" in d)) {
                this.engine.consoleLog(`[${this.strategyName}] Move ${d['move']} has no ownership data, skipping`, OUTPUT_DEBUG);
                continue;
            }

            if (!(d["order"] <= 1 || d["visits"] >= (this.settings.minVisits || 1))) {
                this.engine.consoleLog(`[${this.strategyName}] Move ${d['move']} has order=${d['order']} and visits=${d['visits'] || 'N/A'}, doesn't meet criteria, skipping`, OUTPUT_DEBUG);
                continue;
            }

            const move = Move.fromGtp(d["move"], this.cn!.nextPlayer);
            if (move.isPass && d["pointsLost"] > 0.75) {
                this.engine.consoleLog(`[${this.strategyName}] Move ${move.gtp()} is pass with high point loss (${d['pointsLost']}), skipping`, OUTPUT_DEBUG);
                continue;
            }

            // Calculate metrics
            const ownSettledness = this.settledness(d, nextPlayerSign, this.cn!.nextPlayer);
            const oppSettledness = this.settledness(d, -nextPlayerSign, this.cn!.player);
            const isAttach = this.isAttachment(move);
            const isTenuki = this.isTenuki(move);

            // Calculate total score for sorting
            const score = (
                d["pointsLost"] +
                this.settings.attachPenalty * (isAttach ? 1 : 0) +
                this.settings.tenukiPenalty * (isTenuki ? 1 : 0) -
                this.settings.settledWeight * (ownSettledness + this.settings.opponentFac * oppSettledness)
            );

            this.engine.consoleLog(`[${this.strategyName}] Move ${move.gtp()}: points_lost=${d['pointsLost'].toFixed(2)}, own_settled=${ownSettledness.toFixed(2)}, opp_settled=${oppSettledness.toFixed(2)}, attach=${isAttach}, tenuki=${isTenuki}, score=${score.toFixed(2)}`, OUTPUT_DEBUG);

            movesData.push([
                move,
                ownSettledness,
                oppSettledness,
                isAttach,
                isTenuki,
                d,
                score  // Store the score for debugging
            ]);
        }

        // Sort moves by score
        const sortedMoves = movesData.sort((a, b) => a[6] - b[6]);

        this.engine.consoleLog(`[${this.strategyName}] Found ${sortedMoves.length} valid moves with settledness data`, OUTPUT_DEBUG);
        if (sortedMoves.length > 0) {
            this.engine.consoleLog(`[${this.strategyName}] Top move after sorting: ${sortedMoves[0][0].gtp()} with score ${sortedMoves[0][6].toFixed(2)}`, OUTPUT_DEBUG);
        }

        // Return all data except the score which was just for debugging
        return sortedMoves.map(([move, ownSettled, oppSettled, isAttach, isTenuki, d, _]) => [
            move,
            ownSettled,
            oppSettled,
            isAttach,
            isTenuki,
            d
        ]);
    }
}

@registerStrategy(AI_SIMPLE_OWNERSHIP)
export class SimpleOwnershipStrategy extends OwnershipBaseStrategy {
    constructor(engine: AnalysisEngine, aiSettings: Record<string, any>) {
        super(engine, aiSettings);
    }

    async generateMove(): Promise<[Move, string]> {
        this.engine.consoleLog(`[SimpleOwnershipStrategy] Starting move generation`, OUTPUT_DEBUG);
        await this.cn.t.waitForAnalysis(this.strategyName);

        const candidateMoves = this.cn!.t.candidateMoves;
        this.engine.consoleLog(`[SimpleOwnershipStrategy] Analysis found ${candidateMoves.length} candidate moves`, OUTPUT_DEBUG);

        if (!candidateMoves || candidateMoves.length === 0) {
            this.engine.consoleLog(`[SimpleOwnershipStrategy] No candidate moves found, will play pass`, OUTPUT_DEBUG);
            return [new Move(null, this.cn!.nextPlayer), "No candidate moves found, passing"];
        }

        const topCand = Move.fromGtp(candidateMoves[0]["move"], this.cn!.nextPlayer);
        this.engine.consoleLog(`[SimpleOwnershipStrategy] Top engine move would be: ${topCand.gtp()}`, OUTPUT_DEBUG);

        // Check if top move is pass
        if (topCand.isPass) {
            this.engine.consoleLog(`[SimpleOwnershipStrategy] Top move is pass, so passing regardless of strategy`, OUTPUT_DEBUG);
            return [topCand, "Top move is pass, so passing regardless of strategy."];
        }

        // Get moves sorted by settledness criteria
        this.engine.consoleLog(`[SimpleOwnershipStrategy] Getting moves with settledness info`, OUTPUT_DEBUG);
        const movesWithSettledness = this.getMovesWithSettledness();

        let aimove: Move;
        let aiThoughts: string;

        if (movesWithSettledness && movesWithSettledness.length > 0) {
            this.engine.consoleLog(`[SimpleOwnershipStrategy] Found ${movesWithSettledness.length} moves with settledness info`, OUTPUT_DEBUG);

            // Log top 5 candidates in detail
            this.engine.consoleLog(`[SimpleOwnershipStrategy] Top 5 candidates:`, OUTPUT_DEBUG);
            for (let i = 0; i < Math.min(5, movesWithSettledness.length); i++) {
                const [move, settled, oppsettled, isattach, istenuki, d] = movesWithSettledness[i];
                this.engine.consoleLog(`[SimpleOwnershipStrategy] #${i + 1}: ${move.gtp()} - pt_lost: ${d['pointsLost'].toFixed(1)}, visits: ${d['visits'] || 'N/A'}, settledness: ${settled.toFixed(1)}, opp_settled: ${oppsettled.toFixed(1)}, attach: ${isattach}, tenuki: ${istenuki}`, OUTPUT_DEBUG);
            }

            // Format candidate moves for ai_thoughts
            const cands = movesWithSettledness.slice(0, 5).map(([move, settled, oppsettled, isattach, istenuki, d]) =>
                `${move.gtp()} (${d['pointsLost'].toFixed(1)} pt lost, ${d['visits'] || 'N/A'} visits, ${settled.toFixed(1)} settledness, ${oppsettled.toFixed(1)} opponent settledness${isattach ? ', attachment' : ''}${istenuki ? ', tenuki' : ''})`
            );

            aiThoughts = `${AI_SIMPLE_OWNERSHIP} strategy. Top 5 Candidates ${cands.join(', ')} `;
            aimove = movesWithSettledness[0][0];

            this.engine.consoleLog(`[SimpleOwnershipStrategy] Selected move: ${aimove.gtp()}`, OUTPUT_DEBUG);
        } else {
            const errorMsg = "No moves found - are you using an older KataGo with no per-move ownership info?";
            this.engine.consoleLog(`[SimpleOwnershipStrategy] Error: ${errorMsg}`, OUTPUT_ERROR);
            throw new Error(errorMsg);
        }

        this.engine.consoleLog(`[SimpleOwnershipStrategy] Final decision: ${aimove.gtp()}`, OUTPUT_DEBUG);
        return [aimove, aiThoughts];
    }
}

@registerStrategy(AI_SETTLE_STONES)
export class SettleStonesStrategy extends OwnershipBaseStrategy {
    constructor(engine: AnalysisEngine, aiSettings: Record<string, any>) {
        super(engine, aiSettings);
    }

    /**
     * Calculate settledness for Settle Stones strategy
     */
    settledness(d: any, playerSign: number, player: string): number {
        const [boardSizeX, boardSizeY] = this.engine.boardSize;
        const ownershipGrid = varToGrid(d["ownership"], [boardSizeX, boardSizeY]);

        // Sum the absolute ownership values of existing stones
        const stoneOwnershipValues = this.engine.stones
            .filter(s => s.player === player)
            .map(s => Math.abs(<number>ownershipGrid[s.coords[0]][s.coords[1]]));

        const totalSettledness = stoneOwnershipValues.reduce((sum, val) => sum + val, 0);

        this.engine.consoleLog(`[SettleStonesStrategy] Calculating settledness for ${player}, sign=${playerSign}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[SettleStonesStrategy] Number of stones considered: ${stoneOwnershipValues.length}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[SettleStonesStrategy] Total settledness: ${totalSettledness.toFixed(2)}`, OUTPUT_DEBUG);

        if (stoneOwnershipValues.length > 0) {
            const minOwnership = Math.min(...stoneOwnershipValues);
            const maxOwnership = Math.max(...stoneOwnershipValues);
            const avgOwnership = totalSettledness / stoneOwnershipValues.length;

            this.engine.consoleLog(`[SettleStonesStrategy] Min stone ownership: ${minOwnership.toFixed(2)}`, OUTPUT_DEBUG);
            this.engine.consoleLog(`[SettleStonesStrategy] Max stone ownership: ${maxOwnership.toFixed(2)}`, OUTPUT_DEBUG);
            this.engine.consoleLog(`[SettleStonesStrategy] Avg stone ownership: ${avgOwnership.toFixed(2)}`, OUTPUT_DEBUG);
        }

        return totalSettledness;
    }

    async generateMove(): Promise<[Move, string]> {
        this.engine.consoleLog(`[SettleStonesStrategy] Starting move generation`, OUTPUT_DEBUG);
        await this.cn.t.waitForAnalysis(this.strategyName);

        const candidateMoves = this.cn!.t.candidateMoves;
        this.engine.consoleLog(`[SettleStonesStrategy] Analysis found ${candidateMoves.length} candidate moves`, OUTPUT_DEBUG);

        if (!candidateMoves || candidateMoves.length === 0) {
            this.engine.consoleLog(`[SettleStonesStrategy] No candidate moves found, will play pass`, OUTPUT_DEBUG);
            return [new Move(null, this.cn!.nextPlayer), "No candidate moves found, passing"];
        }

        const topCand = Move.fromGtp(candidateMoves[0]["move"], this.cn!.nextPlayer);
        this.engine.consoleLog(`[SettleStonesStrategy] Top engine move would be: ${topCand.gtp()}`, OUTPUT_DEBUG);

        // Check if top move is pass
        if (topCand.isPass) {
            this.engine.consoleLog(`[SettleStonesStrategy] Top move is pass, so passing regardless of strategy`, OUTPUT_DEBUG);
            return [topCand, "Top move is pass, so passing regardless of strategy."];
        }

        // Log the number of stones on the board
        const blackStones = this.engine.stones.filter(s => s.player === "B").length;
        const whiteStones = this.engine.stones.filter(s => s.player === "W").length;
        this.engine.consoleLog(`[SettleStonesStrategy] Stones on board: B=${blackStones}, W=${whiteStones}`, OUTPUT_DEBUG);

        // Get moves sorted by settledness criteria
        this.engine.consoleLog(`[SettleStonesStrategy] Getting moves with settledness info`, OUTPUT_DEBUG);
        const movesWithSettledness = this.getMovesWithSettledness();

        let aimove: Move;
        let aiThoughts: string;

        if (movesWithSettledness && movesWithSettledness.length > 0) {
            this.engine.consoleLog(`[SettleStonesStrategy] Found ${movesWithSettledness.length} moves with settledness info`, OUTPUT_DEBUG);

            // Log top 5 candidates in detail
            this.engine.consoleLog(`[SettleStonesStrategy] Top 5 candidates:`, OUTPUT_DEBUG);
            for (let i = 0; i < Math.min(5, movesWithSettledness.length); i++) {
                const [move, settled, oppsettled, isattach, istenuki, d] = movesWithSettledness[i];
                this.engine.consoleLog(`[SettleStonesStrategy] #${i + 1}: ${move.gtp()} - pt_lost: ${d['pointsLost'].toFixed(1)}, visits: ${d['visits'] || 'N/A'}, settledness: ${settled.toFixed(1)}, opp_settled: ${oppsettled.toFixed(1)}, attach: ${isattach}, tenuki: ${istenuki}`, OUTPUT_DEBUG);
            }

            // Format candidate moves for ai_thoughts
            const cands = movesWithSettledness.slice(0, 5).map(([move, settled, oppsettled, isattach, istenuki, d]) =>
                `${move.gtp()} (${d['pointsLost'].toFixed(1)} pt lost, ${d['visits'] || 'N/A'} visits, ${settled.toFixed(1)} settledness, ${oppsettled.toFixed(1)} opponent settledness${isattach ? ', attachment' : ''}${istenuki ? ', tenuki' : ''})`
            );

            aiThoughts = `${AI_SETTLE_STONES} strategy. Top 5 Candidates ${cands.join(', ')} `;
            aimove = movesWithSettledness[0][0];

            this.engine.consoleLog(`[SettleStonesStrategy] Selected move: ${aimove.gtp()}`, OUTPUT_DEBUG);
        } else {
            const errorMsg = "No moves found - are you using an older KataGo with no per-move ownership info?";
            this.engine.consoleLog(`[SettleStonesStrategy] Error: ${errorMsg}`, OUTPUT_ERROR);
            throw new Error(errorMsg);
        }

        this.engine.consoleLog(`[SettleStonesStrategy] Final decision: ${aimove.gtp()}`, OUTPUT_DEBUG);
        return [aimove, aiThoughts];
    }
}

@registerStrategy(AI_POLICY)
export class PolicyStrategy extends AIStrategy {
    constructor(engine: AnalysisEngine, aiSettings: Record<string, any>) {
        super(engine, aiSettings);
    }

    async generateMove(): Promise<[Move, string]> {
        this.engine.consoleLog(`[PolicyStrategy] Starting move generation`, OUTPUT_DEBUG);
        await this.cn.t.waitForAnalysis(this.strategyName);

        // Ensure policy is available
        if (!this.cn!.t.policy) {
            this.engine.consoleLog(`[PolicyStrategy] No policy data available, falling back to DefaultStrategy`, OUTPUT_DEBUG);
            return new DefaultStrategy(this.engine, this.settings).generateMove();
        }

        const policyMoves = this.cn!.t.policyRanking;
        const passPolicy = this.cn!.t.policy[this.cn!.t.policy.length - 1];

        this.engine.consoleLog(`[PolicyStrategy] Got ${policyMoves.length} policy moves`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[PolicyStrategy] Current move depth: ${this.cn!.depth}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[PolicyStrategy] Opening moves setting: ${this.settings.openingMoves || 0}`, OUTPUT_DEBUG);

        // Log top 5 policy moves
        this.engine.consoleLog(`[PolicyStrategy] Top 5 policy moves:`, OUTPUT_DEBUG);
        for (let i = 0; i < Math.min(5, policyMoves.length); i++) {
            const [prob, move] = policyMoves[i];
            this.engine.consoleLog(`[PolicyStrategy] #${i + 1}: ${move.gtp()} - ${prob.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })}`, OUTPUT_DEBUG);
        }

        this.engine.consoleLog(`[PolicyStrategy] Pass policy: ${passPolicy.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })}`, OUTPUT_DEBUG);

        // Check for pass in top 5
        const top5Pass = policyMoves.slice(0, 5).some(([, move]) => move.isPass);
        this.engine.consoleLog(`[PolicyStrategy] Pass in top 5: ${top5Pass}`, OUTPUT_DEBUG);

        // Handle opening moves override
        if (this.cn!.depth! <= (this.settings.openingMoves || 0)) {
            this.engine.consoleLog(`[PolicyStrategy] In opening phase, using WeightedStrategy instead`, OUTPUT_DEBUG);
            const weightedSettings = {
                pickOverride: 0.9,
                weakenFac: 1,
                lowerBound: 0.02
            };
            this.engine.consoleLog(`[PolicyStrategy] Weighted settings: ${JSON.stringify(weightedSettings)}`, OUTPUT_DEBUG);
            return new WeightedStrategy(this.engine, weightedSettings).generateMove();
        }

        // Check for pass in top 5
        if (top5Pass) {
            const aimove = policyMoves[0][1];
            this.engine.consoleLog(`[PolicyStrategy] Playing top move ${aimove.gtp()} because pass in top 5`, OUTPUT_DEBUG);
            const aiThoughts = "Playing top one because one of them is pass.";
            return [aimove, aiThoughts];
        }

        // Otherwise play top policy move
        const aimove = policyMoves[0][1];
        this.engine.consoleLog(`[PolicyStrategy] Playing top policy move ${aimove.gtp()} with probability ${policyMoves[0][0].toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })}`, OUTPUT_DEBUG);
        const aiThoughts = `Playing top policy move ${aimove.gtp()}.`;

        this.engine.consoleLog(`[PolicyStrategy] Final decision: ${aimove.gtp()}`, OUTPUT_DEBUG);
        return [aimove, aiThoughts];
    }
}

@registerStrategy(AI_WEIGHTED)
export class WeightedStrategy extends AIStrategy {
    constructor(engine: AnalysisEngine, aiSettings: Record<string, any>) {
        super(engine, aiSettings);
    }

    async generateMove(): Promise<[Move, string]> {
        this.engine.consoleLog(`[WeightedStrategy] Starting move generation`, OUTPUT_DEBUG);
        await this.cn.t.waitForAnalysis(this.strategyName);

        // Ensure policy is available
        if (!this.cn!.t.policy) {
            this.engine.consoleLog(`[WeightedStrategy] No policy data available, falling back to DefaultStrategy`, OUTPUT_DEBUG);
            return new DefaultStrategy(this.engine, this.settings).generateMove();
        }

        const policyMoves = this.cn!.t.policyRanking;
        const passPolicy = this.cn!.t.policy[this.cn!.t.policy.length - 1];

        this.engine.consoleLog(`[WeightedStrategy] Got ${policyMoves.length} policy moves`, OUTPUT_DEBUG);

        // Log top 5 policy moves
        this.engine.consoleLog(`[WeightedStrategy] Top 5 policy moves:`, OUTPUT_DEBUG);
        for (let i = 0; i < Math.min(5, policyMoves.length); i++) {
            const [prob, move] = policyMoves[i];
            this.engine.consoleLog(`[WeightedStrategy] #${i + 1}: ${move.gtp()} - ${prob.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })}`, OUTPUT_DEBUG);
        }

        this.engine.consoleLog(`[WeightedStrategy] Pass policy: ${passPolicy.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })}`, OUTPUT_DEBUG);

        // Check for pass in top 5
        const top5Pass = policyMoves.slice(0, 5).some(([, move]) => move.isPass);
        this.engine.consoleLog(`[WeightedStrategy] Pass in top 5: ${top5Pass}`, OUTPUT_DEBUG);

        // Get override threshold
        const override = this.settings.pickOverride || 0.0;
        this.engine.consoleLog(`[WeightedStrategy] Override threshold: ${override.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })}`, OUTPUT_DEBUG);

        // Check if we should override with top move
        const [overrideMove, overrideThoughts] = this.shouldPlayTopMove(
            policyMoves,
            top5Pass,
            override
        );

        if (overrideMove) {
            this.engine.consoleLog(`[WeightedStrategy] Using override move: ${overrideMove.gtp()}`, OUTPUT_DEBUG);
            return [overrideMove, overrideThoughts];
        }

        // Apply weighted policy move selection
        const lowerBound = this.settings.lowerBound || 0.02;
        const weakenFac = this.settings.weakenFac || 1.0;

        this.engine.consoleLog(`[WeightedStrategy] Using weighted selection with lowerBound=${lowerBound.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })}, weakenFac=${weakenFac}`, OUTPUT_DEBUG);

        // Generate list of weighted coordinates
        const weightedCoords = policyMoves
            .filter(([, move]) => !move.isPass)
            .filter(([pv]) => pv > lowerBound)
            .map(([pv, move]) => [pv, Math.pow(pv, 1 / weakenFac), move] as [number, number, Move]);

        this.engine.consoleLog(`[WeightedStrategy] Found ${weightedCoords.length} moves above lower bound`, OUTPUT_DEBUG);

        let move: Move;
        let aiThoughts: string;

        if (weightedCoords.length > 0) {
            this.engine.consoleLog(`[WeightedStrategy] Performing weighted selection`, OUTPUT_DEBUG);
            const top = weightedSelectionWithoutReplacement(weightedCoords, 1)[0];
            move = top[2] as Move;
            const prob = top[0];

            this.engine.consoleLog(`[WeightedStrategy] Selected move ${move.gtp()} with probability ${prob.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })}`, OUTPUT_DEBUG);
            aiThoughts = `Playing policy-weighted random move ${move.gtp()} (${prob.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 1 })}) from ${weightedCoords.length} moves above lowerBound of ${lowerBound.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 1 })}.`;
        } else {
            move = policyMoves[0][1];
            this.engine.consoleLog(`[WeightedStrategy] No moves above lower bound, playing top policy move ${move.gtp()}`, OUTPUT_DEBUG);
            aiThoughts = `Playing top policy move because no non-pass move > above lowerBound of ${lowerBound.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 1 })}.`;
        }

        this.engine.consoleLog(`[WeightedStrategy] Final decision: ${move.gtp()}`, OUTPUT_DEBUG);
        return [move, aiThoughts];
    }
}


export class PickBasedStrategy extends AIStrategy {
    constructor(engine: AnalysisEngine, aiSettings: Record<string, any>) {
        super(engine, aiSettings);
    }

    /**
     * Calculate the number of moves to consider
     */
    getNMoves(legalPolicyMoves: [number, Move][]): number {
        const boardSquares = this.engine.boardSize[0] * this.engine.boardSize[1];

        let nMoves: number;
        if (this.settings.pickFrac !== undefined) {
            nMoves = Math.max(1, Math.floor(this.settings.pickFrac * legalPolicyMoves.length + this.settings.pickN));
            this.engine.consoleLog(`[${this.strategyName}] Calculated n_moves=${nMoves} from pickFrac=${this.settings.pickFrac}, pickN=${this.settings.pickN}, legal_moves=${legalPolicyMoves.length}`, OUTPUT_DEBUG);
        } else {
            nMoves = 1; // Default
            this.engine.consoleLog(`[${this.strategyName}] Using default n_moves=${nMoves} (no pickFrac in settings)`, OUTPUT_DEBUG);
        }

        return nMoves;
    }

    /**
     * Generate weighted coordinates for selection
     */
    generateWeightedCoords(legalPolicyMoves: [number, Move][], policyGrid: number[][], size: [number, number]): [[number, number, number, number][], string] {
        this.engine.consoleLog(`[${this.strategyName}] Generating weighted coordinates (default equal weights implementation)`, OUTPUT_DEBUG);

        // Default implementation for AI_PICK - equal weights
        const weightedCoords: [number, number, number, number][] = [];
        for (let x = 0; x < size[0]; x++) {
            for (let y = 0; y < size[1]; y++) {
                if (policyGrid[y][x] > 0) {
                    weightedCoords.push([policyGrid[y][x], 1, x, y]);
                }
            }
        }

        this.engine.consoleLog(`[${this.strategyName}] Generated ${weightedCoords.length} weighted coordinates`, OUTPUT_DEBUG);

        if (weightedCoords.length > 0) {
            const top5 = weightedCoords
                .sort((a, b) => b[0] - a[0])
                .slice(0, 5);
            this.engine.consoleLog(`[${this.strategyName}] Top 5 weighted coordinates by policy value:`, OUTPUT_DEBUG);
            for (let i = 0; i < top5.length; i++) {
                const [pol, wt, x, y] = top5[i];
                this.engine.consoleLog(`[${this.strategyName}] #${i + 1}: (${x},${y}) - policy=${(pol * 100).toFixed(2)}%, weight=${wt}`, OUTPUT_DEBUG);
            }
        }

        return [weightedCoords, "Generated equal weights for all moves. "];
    }

    /**
     * Handle special endgame case
     */
    handleEndgame(legalPolicyMoves: [number, Move][], policyGrid: number[][], size: [number, number]): [[number, number, number, number][], string, number, boolean] | [null, string, null, false] {
        const boardSquares = size[0] * size[1];
        const endgameThreshold = (this.settings.endgame || 0.75) * boardSquares;

        this.engine.consoleLog(`[${this.strategyName}] Checking endgame condition: move depth ${this.cn!.depth} vs threshold ${endgameThreshold}`, OUTPUT_DEBUG);

        if (this.cn!.depth! > endgameThreshold) {
            this.engine.consoleLog(`[${this.strategyName}] In endgame phase (move ${this.cn!.depth} > ${endgameThreshold})`, OUTPUT_DEBUG);

            const weightedCoords: [number, number, number, number][] = legalPolicyMoves.map(([pol, mv]) => [
                pol,
                1,
                mv.coords[0],
                mv.coords[1]
            ]);
            const aiThoughts = `Generated equal weights as move number >= ${(this.settings.endgame || 0.75) * size[0] * size[1]}. `;

            const nMoves = Math.floor(Math.max(this.getNMoves(legalPolicyMoves), legalPolicyMoves.length / 2));
            this.engine.consoleLog(`[${this.strategyName}] Using endgame n_moves=${nMoves}`, OUTPUT_DEBUG);

            this.engine.consoleLog(`[${this.strategyName}] Generated ${weightedCoords.length} weighted coordinates for endgame`, OUTPUT_DEBUG);

            return [weightedCoords, aiThoughts, nMoves, true];
        }

        this.engine.consoleLog(`[${this.strategyName}] Not in endgame phase yet`, OUTPUT_DEBUG);
        return [null, "", null, false];
    }

    /**
     * Select moves from weighted coordinates
     */
    selectFromWeightedCoords(weightedCoords: [number, number ,number, number][], nMoves: number, passPolicy: number): [Move, string] {
        this.engine.consoleLog(`[${this.strategyName}] Selecting from ${weightedCoords.length} weighted coordinates, n_moves=${nMoves}`, OUTPUT_DEBUG);

        // Perform weighted selection
        const pickMoves = weightedSelectionWithoutReplacement(weightedCoords, nMoves);
        this.engine.consoleLog(`[${this.strategyName}] Picked ${pickMoves.length} moves`, OUTPUT_DEBUG);

        let aimove: Move;
        let aiThoughts: string;

        if (pickMoves.length > 0) {
            // Get top 5 from picked moves
            const topPicked = pickMoves
                .sort((a, b) => b[0] - a[0])
                .slice(0, 5);
            this.engine.consoleLog(`[${this.strategyName}] Top 5 after selection:`, OUTPUT_DEBUG);
            for (let i = 0; i < topPicked.length; i++) {
                const [p, wt, x, y] = topPicked[i];
                this.engine.consoleLog(`[${this.strategyName}] #${i + 1}: (${x},${y}) - policy=${(p * 100).toFixed(2)}%, weight=${wt}`, OUTPUT_DEBUG);
            }

            // Convert to move objects
            const newTop: [number, Move][] = topPicked.map(([p, wt, x, y]) => [
                p,
                new Move([x, y], this.cn!.nextPlayer)
            ]);

            aimove = newTop[0][1];
            aiThoughts = `Top 5 among these were ${fmtMoves(newTop)} and picked top ${aimove.gtp()}. `;

            this.engine.consoleLog(`[${this.strategyName}] Top picked move: ${aimove.gtp()} (${(newTop[0][0] * 100).toFixed(2)}%)`, OUTPUT_DEBUG);
            this.engine.consoleLog(`[${this.strategyName}] Pass policy: ${(passPolicy * 100).toFixed(2)}%`, OUTPUT_DEBUG);

            // Check if pass is better
            if (newTop[0][0] < passPolicy) {
                this.engine.consoleLog(`[${this.strategyName}] Pass policy ${(passPolicy * 100).toFixed(2)}% is better than top move ${aimove.gtp()} (${(newTop[0][0] * 100).toFixed(2)}%), switching to top policy move`, OUTPUT_DEBUG);

                const policyMoves = this.cn!.t.policyRanking;
                const topPolicyMove = policyMoves[0][1];

                aiThoughts += `But found pass (${(passPolicy * 100).toFixed(2)}% to be higher rated than ${aimove.gtp()} (${(newTop[0][0] * 100).toFixed(2)}%) so will play top policy move instead.`;
                aimove = topPolicyMove;

                this.engine.consoleLog(`[${this.strategyName}] Final move (after pass check): ${aimove.gtp()}`, OUTPUT_DEBUG);
            } else {
                this.engine.consoleLog(`[${this.strategyName}] Top move is better than pass, keeping it`, OUTPUT_DEBUG);
            }
        } else {
            this.engine.consoleLog(`[${this.strategyName}] No moves selected, falling back to top policy move`, OUTPUT_DEBUG);

            const policyMoves = this.cn!.t.policyRanking;
            const topPolicyMove = policyMoves[0][1];
            aimove = topPolicyMove;

            aiThoughts = `Pick policy strategy failed to find legal moves, so is playing top policy move ${aimove.gtp()}.`;

            this.engine.consoleLog(`[${this.strategyName}] Final move (fallback): ${aimove.gtp()}`, OUTPUT_DEBUG);
        }

        return [aimove, aiThoughts];
    }

    async generateMove(): Promise<[Move, string]> {
        this.engine.consoleLog(`[${this.strategyName}] Starting move generation`, OUTPUT_DEBUG);
        await this.cn.t.waitForAnalysis(this.strategyName);

        // Ensure policy is available
        if (!this.cn!.t.policy) {
            this.engine.consoleLog(`[${this.strategyName}] No policy data available, falling back to DefaultStrategy`, OUTPUT_DEBUG);
            return new DefaultStrategy(this.engine, this.settings).generateMove();
        }

        const policyMoves = this.cn!.t.policyRanking;
        const passPolicy = this.cn!.t.policy[this.cn!.t.policy.length - 1];

        this.engine.consoleLog(`[${this.strategyName}] Got ${policyMoves.length} policy moves`, OUTPUT_DEBUG);

        // Log top 5 policy moves
        this.engine.consoleLog(`[${this.strategyName}] Top 5 policy moves:`, OUTPUT_DEBUG);
        for (let i = 0; i < Math.min(5, policyMoves.length); i++) {
            const [prob, move] = policyMoves[i];
            this.engine.consoleLog(`[${this.strategyName}] #${i + 1}: ${move.gtp()} - ${(prob * 100).toFixed(2)}%`, OUTPUT_DEBUG);
        }

        this.engine.consoleLog(`[${this.strategyName}] Pass policy: ${(passPolicy * 100).toFixed(2)}%`, OUTPUT_DEBUG);

        // Check for pass in top 5
        const top5Pass = policyMoves.slice(0, 5).some(([, move]) => move.isPass);
        this.engine.consoleLog(`[${this.strategyName}] Pass in top 5: ${top5Pass}`, OUTPUT_DEBUG);

        // Get override settings
        const override = this.settings.pickOverride || 0.0;
        const overridetwo = this.settings.pickOverride_two || 1.0;
        this.engine.consoleLog(`[${this.strategyName}] Override settings: single=${(override * 100).toFixed(2)}%, combined=${(overridetwo * 100).toFixed(2)}%`, OUTPUT_DEBUG);

        // Check if we should override with top move
        const [overrideMove, overrideThoughts] = this.shouldPlayTopMove(
            policyMoves,
            top5Pass,
            override,
            overridetwo
        );

        if (overrideMove) {
            this.engine.consoleLog(`[${this.strategyName}] Using override move: ${overrideMove.gtp()}`, OUTPUT_DEBUG);
            return [overrideMove, overrideThoughts];
        }

        // Get legal policy moves
        const legalPolicyMoves = policyMoves
            .filter(([, move]) => !move.isPass)
            .filter(([pol]) => pol > 0);
        this.engine.consoleLog(`[${this.strategyName}] Found ${legalPolicyMoves.length} legal non-pass policy moves`, OUTPUT_DEBUG);

        // Create policy grid
        const size = this.engine.boardSize;
        this.engine.consoleLog(`[${this.strategyName}] Board size: ${size}`, OUTPUT_DEBUG);
        const policyGrid = varToGrid(this.cn!.t.policy, size);

        // Check for endgame
        const [endCoords, endThoughts, endNMoves, isEndgame] = this.handleEndgame(legalPolicyMoves, policyGrid, size);

        if (isEndgame && endCoords && endNMoves) {
            this.engine.consoleLog(`[${this.strategyName}] Using endgame logic`, OUTPUT_DEBUG);
            const [move, thoughts] = this.selectFromWeightedCoords(endCoords, endNMoves, passPolicy);
            return [move, thoughts];
        }

        // Get weighted coordinates
        this.engine.consoleLog(`[${this.strategyName}] Generating weighted coordinates`, OUTPUT_DEBUG);
        const [weightedCoords, weightThoughts] = this.generateWeightedCoords(legalPolicyMoves, policyGrid, size);

        // Get number of moves to consider
        const nMoves = this.getNMoves(legalPolicyMoves);
        this.engine.consoleLog(`[${this.strategyName}] Using n_moves=${nMoves}`, OUTPUT_DEBUG);

        const aiThoughts = weightThoughts + `Picked ${Math.min(nMoves, weightedCoords.length)} random moves according to weights. `;

        // Select and return move
        this.engine.consoleLog(`[${this.strategyName}] Selecting move from weighted coordinates`, OUTPUT_DEBUG);
        const [move, thoughts] = this.selectFromWeightedCoords(weightedCoords, nMoves, passPolicy);

        this.engine.consoleLog(`[${this.strategyName}] Final decision: ${move.gtp()}`, OUTPUT_DEBUG);
        return [move, aiThoughts + thoughts];
    }
}

@registerStrategy(AI_PICK)
export class PickStrategy extends PickBasedStrategy {
    constructor(engine: AnalysisEngine, aiSettings: Record<string, any>) {
        super(engine, aiSettings);
    }

    async generateMove(): Promise<[Move, string]> {
        this.engine.consoleLog(`[PickStrategy] Starting move generation using base PickBasedStrategy implementation`, OUTPUT_DEBUG);
        return super.generateMove();
    }

    handleEndgame(legalPolicyMoves: [number, Move][], policyGrid: number[][], size: [number, number]): [null, string, null, false] {
        return [null, "", null, false];
    }
}

@registerStrategy(AI_RANK)
export class RankStrategy extends PickBasedStrategy {
    constructor(engine: AnalysisEngine, aiSettings: Record<string, any>) {
        super(engine, aiSettings);
    }

    /**
     * Calculate n_moves based on rank
     */
    getNMoves(legalPolicyMoves: [number, Move][]): number {
        this.engine.consoleLog(`[RankStrategy] Calculating n_moves based on rank`, OUTPUT_DEBUG);

        const size = this.engine.boardSize;
        const boardSquares = size[0] * size[1];
        const normLegMoves = legalPolicyMoves.length / boardSquares;

        this.engine.consoleLog(`[RankStrategy] Board squares: ${boardSquares}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[RankStrategy] Legal moves: ${legalPolicyMoves.length}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[RankStrategy] Normalized legal moves: ${normLegMoves.toFixed(4)}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[RankStrategy] Kyu rank: ${this.settings.kyuRank}`, OUTPUT_DEBUG);

        // Calculate n_moves using the rank formula
        const origCalibAvemodrank = 0.063015 + 0.7624 * boardSquares / (
            Math.pow(10, -0.05737 * this.settings.kyuRank + 1.9482)
        );

        this.engine.consoleLog(`[RankStrategy] Original calibrated average mod rank: ${origCalibAvemodrank.toFixed(4)}`, OUTPUT_DEBUG);

        const exponentTerm = (
            3.002 * normLegMoves * normLegMoves
            - normLegMoves
            - 0.034889 * this.settings.kyuRank
            - 0.5097
        );
        this.engine.consoleLog(`[RankStrategy] Exponent term: ${exponentTerm.toFixed(4)}`, OUTPUT_DEBUG);

        const modifiedCalibAvemodrank = (
            0.3931
            + 0.6559
            * normLegMoves
            * Math.exp(-1 * Math.pow(exponentTerm, 2))
            - 0.01093 * this.settings.kyuRank
        ) * origCalibAvemodrank;

        this.engine.consoleLog(`[RankStrategy] Modified calibrated average mod rank: ${modifiedCalibAvemodrank.toFixed(4)}`, OUTPUT_DEBUG);

        const denominator = 1.31165 * (modifiedCalibAvemodrank + 1) - 0.082653;
        this.engine.consoleLog(`[RankStrategy] Denominator: ${denominator.toFixed(4)}`, OUTPUT_DEBUG);

        let nMoves = boardSquares * normLegMoves / denominator;
        nMoves = Math.max(1, Math.round(nMoves));

        this.engine.consoleLog(`[RankStrategy] Calculated n_moves: ${nMoves}`, OUTPUT_DEBUG);

        return nMoves;
    }

    /**
     * Special override logic for rank-based
     */
    shouldPlayTopMove(policyMoves: [number, Move][], top5Pass: boolean, override = 0.0, overridetwo = 1.0): [Move | null, string] {
        this.engine.consoleLog(`[RankStrategy] Calculating special override thresholds based on rank`, OUTPUT_DEBUG);

        const size = this.engine.boardSize;
        const boardSquares = size[0] * size[1];
        const legalPolicyMoves = policyMoves.filter(([pol, mv]) => !mv.isPass && pol > 0);

        // Parameters for calculating the overrides
        this.engine.consoleLog(`[RankStrategy] Board squares: ${boardSquares}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[RankStrategy] Legal non-pass moves: ${legalPolicyMoves.length}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[RankStrategy] Kyu rank: ${this.settings.kyuRank}`, OUTPUT_DEBUG);

        // Calibrated override based on board filling
        const ratio = (boardSquares - legalPolicyMoves.length) / boardSquares;
        override = 0.8 * (1 - 0.5 * ratio);
        this.engine.consoleLog(`[RankStrategy] Calculated override: ${(override * 100).toFixed(2)}% (from board filling ratio ${ratio.toFixed(2)})`, OUTPUT_DEBUG);

        overridetwo = 0.85 + Math.max(0, 0.02 * (this.settings.kyuRank - 8));
        this.engine.consoleLog(`[RankStrategy] Calculated overridetwo: ${(overridetwo * 100).toFixed(2)}% (from kyu rank adjustment)`, OUTPUT_DEBUG);

        // Call the parent class method with calculated overrides
        return super.shouldPlayTopMove(policyMoves, top5Pass, override, overridetwo);
    }

    handleEndgame(legalPolicyMoves: [number, Move][], policyGrid: number[][], size: [number, number]): [null, string, null, false] {
        return [null, "", null, false];
    }
}

@registerStrategy(AI_INFLUENCE)
export class InfluenceStrategy extends PickBasedStrategy {
    constructor(engine: AnalysisEngine, aiSettings: Record<string, any>) {
        super(engine, aiSettings);
    }

    /**
     * Generate influence-based weights
     */
    generateWeightedCoords(legalPolicyMoves: [number, Move][], policyGrid: number[][], size: [number, number]): [[number, number, number, number][], string] {
        this.engine.consoleLog(`[InfluenceStrategy] Generating influence-based weights`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[InfluenceStrategy] Settings: threshold=${this.settings.threshold}, lineWeight=${this.settings.lineWeight}`, OUTPUT_DEBUG);
        const [weightedCoords, aiThoughts] = generateInfluenceTerritoryWeights(
            AI_INFLUENCE, // Assuming this constant exists
            this.settings,
            policyGrid,
            size
        );
        this.engine.consoleLog(`[InfluenceStrategy] Generated ${weightedCoords.length} weighted coordinates`, OUTPUT_DEBUG);

        // Note: The original Python code uses heapq.nlargest which is not directly translatable
        // This would need to be implemented based on the actual use case

        return [weightedCoords, aiThoughts];
    }
}

@registerStrategy(AI_TERRITORY)
export class TerritoryStrategy extends PickBasedStrategy {
    constructor(engine: AnalysisEngine, aiSettings: Record<string, any>) {
        super(engine, aiSettings);
    }

    /**
     * Generate territory-based weights
     */
    generateWeightedCoords(legalPolicyMoves: [number, Move][], policyGrid: number[][], size: [number, number]): [[number, number, number, number][], string] {
        this.engine.consoleLog(`[TerritoryStrategy] Generating territory-based weights`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[TerritoryStrategy] Settings: threshold=${this.settings.threshold}, lineWeight=${this.settings.lineWeight}`, OUTPUT_DEBUG);
        const [weightedCoords, aiThoughts] = generateInfluenceTerritoryWeights(
            'AI_TERRITORY', // Assuming this constant exists
            this.settings,
            policyGrid,
            size
        );
        this.engine.consoleLog(`[TerritoryStrategy] Generated ${weightedCoords.length} weighted coordinates`, OUTPUT_DEBUG);

        // Note: The original Python code uses heapq.nlargest which is not directly translatable
        // This would need to be implemented based on the actual use case

        return [weightedCoords, aiThoughts];
    }
}

@registerStrategy(AI_LOCAL)
export class LocalStrategy extends PickBasedStrategy {
    constructor(engine: AnalysisEngine, aiSettings: Record<string, any>) {
        super(engine, aiSettings);
    }

    async generateMove(): Promise<[Move, string]> {
        // Handle the case where there's no previous move
        if (!(this.cn!.move && this.cn!.move.coords)) {
            this.engine.consoleLog(`[LocalStrategy] No previous move with valid coordinates found, falling back to WeightedStrategy`, OUTPUT_DEBUG);
            this.engine.consoleLog(`[LocalStrategy] Using default weighted settings: pickOverride=0.9, weakenFac=1, lowerBound=0.02`, OUTPUT_DEBUG);
            return new WeightedStrategy(this.engine, {
                pickOverride: 0.9,
                weakenFac: 1,
                lowerBound: 0.02
            }).generateMove();
        }

        return super.generateMove();
    }

    /**
     * Generate local-based weights
     */
    generateWeightedCoords(legalPolicyMoves: [number, Move][], policyGrid: number[][], size: [number, number]): [[number, number, number, number][], string] {
        this.engine.consoleLog(`[LocalStrategy] Generating local-based weights around previous move`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[LocalStrategy] Previous move: ${this.cn!.move!.gtp()}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[LocalStrategy] Variance setting: ${this.settings.stddev}`, OUTPUT_DEBUG);
        const [weightedCoords, aiThoughts] = generateLocalTenukiWeights(
            'AI_LOCAL', // Assuming this constant exists
            this.settings,
            policyGrid,
            this.cn!,
            size
        );
        this.engine.consoleLog(`[LocalStrategy] Generated ${weightedCoords.length} weighted coordinates`, OUTPUT_DEBUG);

        // Note: The original Python code uses heapq.nlargest which is not directly translatable
        // This would need to be implemented based on the actual use case

        return [weightedCoords, aiThoughts];
    }
}

@registerStrategy(AI_TENUKI)
export class TenukiStrategy extends PickBasedStrategy {
    constructor(engine: AnalysisEngine, aiSettings: Record<string, any>) {
        super(engine, aiSettings);
    }

    async generateMove(): Promise<[Move, string]> {
        // Handle the case where there's no previous move
        if (!(this.cn!.move && this.cn!.move.coords)) {
            this.engine.consoleLog(`[TenukiStrategy] No previous move with valid coordinates found, falling back to WeightedStrategy`, OUTPUT_DEBUG);
            this.engine.consoleLog(`[TenukiStrategy] Using default weighted settings: pickOverride=0.9, weakenFac=1, lowerBound=0.02`, OUTPUT_DEBUG);
            return new WeightedStrategy(this.engine, {
                pickOverride: 0.9,
                weakenFac: 1,
                lowerBound: 0.02
            }).generateMove();
        }

        return super.generateMove();
    }

    /**
     * Generate tenuki-based weights
     */
    generateWeightedCoords(legalPolicyMoves: [number, Move][], policyGrid: number[][], size: [number, number]): [[number, number, number, number][], string] {
        this.engine.consoleLog(`[TenukiStrategy] Generating tenuki-based weights (far from previous move)`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[TenukiStrategy] Previous move: ${this.cn!.move!.gtp()}`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[TenukiStrategy] Variance setting: ${this.settings.stddev}`, OUTPUT_DEBUG);
        const [weightedCoords, aiThoughts] = generateLocalTenukiWeights(
            'AI_TENUKI', // Assuming this constant exists
            this.settings,
            policyGrid,
            this.cn!,
            size
        );
        this.engine.consoleLog(`[TenukiStrategy] Generated ${weightedCoords.length} weighted coordinates`, OUTPUT_DEBUG);

        // Note: The original Python code uses heapq.nlargest which is not directly translatable
        // This would need to be implemented based on the actual use case

        return [weightedCoords, aiThoughts];
    }
}

@registerStrategy(AI_HUMAN)
@registerStrategy(AI_PRO)
export class HumanStyleStrategy extends AIStrategy {
    constructor(engine: AnalysisEngine, aiSettings: Record<string, any>) {
        super(engine, aiSettings);
        this.engine.consoleLog(`[HumanStyleStrategy] Initializing HumanStyleStrategy`, OUTPUT_DEBUG);
        this.engine.consoleLog(`[HumanStyleStrategy] AI settings: ${JSON.stringify(aiSettings)}`, OUTPUT_DEBUG);
    }

    async generateMove(): Promise<[Move, string]> {
        this.engine.consoleLog(`[HumanStyleStrategy] Starting move generation`, OUTPUT_DEBUG);

        let humanProfile: string;

        if ("humanKyuRank" in this.settings) {
            const humanKyuRank = Math.round(this.settings.humanKyuRank);
            const humanStyle = this.settings.modernStyle ? "rank" : "preaz";

            let rankText: string;
            if (humanKyuRank <= 0) {  // dan ranks
                rankText = `${1 - humanKyuRank}d`;
            } else {  // kyu ranks
                rankText = `${humanKyuRank}k`;
            }

            humanProfile = `${humanStyle}_${rankText}`;
        } else {
            const proYear = Math.round(this.settings.proYear);
            humanProfile = `proyear_${proYear}`;
        }

        this.engine.consoleLog(`[HumanStyleStrategy] Human profile string: ${humanProfile}`, OUTPUT_DEBUG);

        // Define override settings (separate from includePolicy)
        const overrideSettings = {
            humanSLProfile: humanProfile,
            ignorePreRootHistory: false,
        };
        this.engine.consoleLog(`[HumanStyleStrategy] Override settings for engine: ${JSON.stringify(overrideSettings)}`, OUTPUT_DEBUG);

        // Request analysis from engine - note includePolicy is a direct parameter
        let analysis: any = null;

        const setAnalysis = (a: any, partialResult: boolean) => {
            if (!partialResult) {
                this.engine.consoleLog(`[HumanStyleStrategy] Full analysis results received`, OUTPUT_DEBUG);
                analysis = a;
                // Log some analysis stats for debugging
                if (a) {
                    this.engine.consoleLog(`[HumanStyleStrategy] Analysis contains humanPolicy: ${'humanPolicy' in a}`, OUTPUT_DEBUG);
                    this.engine.consoleLog(`[HumanStyleStrategy] Analysis contains moveInfos: ${a.moveInfos ? a.moveInfos.length : 0} moves`, OUTPUT_DEBUG);
                    if (a.humanPolicy) {
                        const policySum = a.humanPolicy.reduce((sum: number, val: number) => sum + val, 0);
                        const policyMax = Math.max(...a.humanPolicy);
                        this.engine.consoleLog(`[HumanStyleStrategy] Human policy sum: ${policySum}, max: ${policyMax}`, OUTPUT_DEBUG);
                    }
                }
            } else {
                this.engine.consoleLog(`[HumanStyleStrategy] Received partial analysis results - ignoring`, OUTPUT_DEBUG);
            }
        };

        let error = false;
        const setError = (a: any) => {
            error = true;
            this.engine.consoleLog(`[HumanStyleStrategy] Error in human analysis query: ${a}`, OUTPUT_ERROR);
            this.engine.consoleLog(`[HumanStyleStrategy] Will attempt to fall back to policy move`, OUTPUT_DEBUG);
        };

        this.engine.consoleLog(`[HumanStyleStrategy] Getting engine for player`, OUTPUT_DEBUG);
        const engine = this.engine.engines[this.cn!.player];
        this.engine.consoleLog(`[HumanStyleStrategy] Using engine for player ${this.cn!.player}`, OUTPUT_DEBUG);

        this.engine.consoleLog(`[HumanStyleStrategy] Requesting analysis with human profile settings`, OUTPUT_DEBUG);
        engine.requestAnalysis(
            {
                node: this.cn,
                callback: setAnalysis,
                errorCallback: setError,
                priority: PRIORITY_EXTRA_AI_QUERY, // Assuming this constant exists
                includePolicy: true, // include_policy
                extraSettings: overrideSettings
            }
        );
        this.engine.consoleLog(`[HumanStyleStrategy] Analysis request sent, waiting for results`, OUTPUT_DEBUG);

        await new Promise(resolve => {
            const interval = setInterval(() => {
                if (error || analysis) {
                    clearInterval(interval);
                    resolve(null);
                }
            }, 10);
        });


        this.engine.consoleLog(`[HumanStyleStrategy] Finished waiting for analysis, error=${error}, analysis received=${analysis !== null}`, OUTPUT_DEBUG);

        if (error || !analysis) {
            this.engine.consoleLog(`[HumanStyleStrategy] Analysis failed or returned empty`, OUTPUT_DEBUG);
            // Fall back to policy
            const policyMove = this.cn!.t.policyRanking && this.cn!.t.policyRanking.length > 0 ? this.cn!.t.policyRanking[0][1] : null;
            if (policyMove) {
                this.engine.consoleLog(`[HumanStyleStrategy] Falling back to top policy move: ${policyMove.gtp()}`, OUTPUT_DEBUG);
                return [policyMove, "Falling back to policy move due to error in human analysis."];
            } else {
                this.engine.consoleLog(`[HumanStyleStrategy] No policy moves available for fallback - will return pass`, OUTPUT_DEBUG);
                return [new Move(null, this.cn!.nextPlayer), "No valid moves found."];
            }
        }

        // Check if human policy is available
        this.engine.consoleLog(`[HumanStyleStrategy] Processing analysis results`, OUTPUT_DEBUG);
        if (!("humanPolicy" in analysis)) {
            const errorMsg = "humanPolicy not found in analysis—have you downloaded and configured your human model yet?";
            throw new Error(errorMsg);
        }

        this.engine.consoleLog(`[HumanStyleStrategy] Human policy found in analysis`, OUTPUT_DEBUG);
        const boardSize = this.engine.boardSize;
        this.engine.consoleLog(`[HumanStyleStrategy] Board size: ${boardSize}`, OUTPUT_DEBUG);
        const humanPolicy = analysis.humanPolicy;
        this.engine.consoleLog(`[HumanStyleStrategy] Human policy length: ${humanPolicy.length}`, OUTPUT_DEBUG);
        if (humanPolicy.length !== 362) {
            this.engine.consoleLog(`[HumanStyleStrategy] WARNING: Human policy length ${humanPolicy.length} != 362`, OUTPUT_ERROR);
        }

        // Create a list of moves with their human policy weights
        const moves: [Move, number][] = [];
        for (let x = 0; x < boardSize[0]; x++) {
            for (let y = 0; y < boardSize[1]; y++) {
                const idx = (boardSize[1] - y - 1) * boardSize[0] + x;
                if (idx < humanPolicy.length && humanPolicy[idx] > 0) {
                    moves.push([new Move([x, y], this.cn!.nextPlayer), humanPolicy[idx]]);
                }
            }
        }

        this.engine.consoleLog(`[HumanStyleStrategy] Generated ${moves.length} candidate moves from human policy`, OUTPUT_DEBUG);

        // Add pass move if it has positive probability
        if (humanPolicy.length > boardSize[0] * boardSize[1] && humanPolicy[humanPolicy.length - 1] > 0) {
            this.engine.consoleLog(`[HumanStyleStrategy] Adding pass move with probability ${humanPolicy[humanPolicy.length - 1]}`, OUTPUT_DEBUG);
            moves.push([new Move(null, this.cn!.nextPlayer), humanPolicy[humanPolicy.length - 1]]);
        }

        this.engine.consoleLog(`[HumanStyleStrategy] Performing weighted selection from ${moves.length} moves`, OUTPUT_DEBUG);
        const topMoves = moves.sort((a, b) => b[1] - a[1]);
        this.engine.consoleLog(`[HumanStyleStrategy] Top 5 moves by probability:`, OUTPUT_DEBUG);

        // Create a formatted string of top 5 moves for ai_thoughts
        const topMovesStr = topMoves.slice(0, 5)
            .map(([move, prob], i) => `#${i + 1}: ${move.gtp()} - ${(prob * 100).toFixed(1)}%`)
            .join("\n");

        this.engine.consoleLog(`[HumanStyleStrategy]\n${topMovesStr}`, OUTPUT_DEBUG);

        const selected = weightedSelectionWithoutReplacement(moves.map(([move, prob]) => [prob, prob, move] as [number, number, Move]), 1)[0];
        const move = selected[2];
        const prob = selected[0];

        // Find the rank of the selected move
        let selectedRank = "ERROR: move not found in ranking";
        for (let i = 0; i < topMoves.length; i++) {
            if (topMoves[i][0].gtp() === move.gtp()) {
                selectedRank = `${i + 1}`;
                break;
            }
        }

        this.engine.consoleLog(`[HumanStyleStrategy] Selected move ${move.gtp()} with probability ${prob.toFixed(4)}`, OUTPUT_DEBUG);
        const aiThoughts = `\n${topMovesStr}\n\nPlayed move ${move.gtp()} (${(prob * 100).toFixed(1)}%) as the #${selectedRank} top move.`;
        this.engine.consoleLog(`[HumanStyleStrategy] Final decision: ${move.gtp()}`, OUTPUT_DEBUG);
        return [move, aiThoughts];
    }
}

export const generateAiMove = async (
    engine: AnalysisEngine,
    aiMode: string,
    aiSettings: Record<string, any>,
): Promise<[Move, SGFNode<NodeInfo>]> => {
    engine.consoleLog(`Generate AI move called with mode: ${aiMode}`, OUTPUT_DEBUG);

    // Create the appropriate strategy based on mode
    const StrategyClass = STRATEGY_REGISTRY[aiMode];
    if (!StrategyClass) {
        throw new Error(`Unknown AI strategy: ${aiMode}`);
    }

    const strategy = new StrategyClass(engine, aiSettings);

    // Generate the move
    engine.consoleLog(`Generating move using ${strategy.constructor.name}`, OUTPUT_DEBUG);
    const [move, aiThoughts] = await strategy.generateMove();

    // Play the move and return
    engine.consoleLog(`Playing move ${move.gtp()} and creating game node`, OUTPUT_DEBUG);
    const playedNode = await engine.play(move);
    engine.consoleLog(`AI thoughts: ${aiThoughts}`, OUTPUT_DEBUG);
    playedNode.t.aiThoughts = aiThoughts;


    
    engine.consoleLog(`Move generation complete: ${move.gtp()}`, OUTPUT_DEBUG);
    return [move, playedNode];
};