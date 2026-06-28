// game_node.ts
import * as base64 from 'base-64';
import * as zlib from 'zlib';
import { Move, NodeExpand, SGFNode } from './sgfParser';

import { 
    ANALYSIS_FORMAT_VERSION, 
    PROGRAM_NAME, 
    REPORT_DT, 
    SGF_INTERNAL_COMMENTS_MARKER, 
    SGF_SEPARATOR_MARKER, 
    VERSION, 
    PRIORITY_DEFAULT, 
    ADDITIONAL_MOVE_ORDER, 
    OUTPUT_DEBUG
} from './constants';
import { KataGoEngineInterface } from './katagoAnalysis';

// Mock i18n function - in real implementation this would be properly imported
const i18n = {
    _: (key: string) => key,
    format: (template: string, params: Record<string, any>) => {
        return template.replace(/\{(\w+)\}/g, (match, key) => params[key] || match);
    }
};

// Mock Theme - in real implementation this would be properly imported
const Theme = {
    INFO_PV_COLOR: "#0000FF"
};

// Mock utility functions - in real implementation these would be properly imported
const evaluationClass = (pointsLost: number, thresholds: number[]): number => {
    for (let i = 0; i < thresholds.length; i++) {
        if (pointsLost <= thresholds[i]) {
            return i;
        }
    }
    return thresholds.length - 1;
};

const packFloats = (data: number[]): string => {
    // Simplified implementation
    return JSON.stringify(data);
};

const unpackFloats = (data: string, expectedLength: number): number[] => {
    // Simplified implementation
    return JSON.parse(data);
};

const varToGrid = (data: number[], size: [number, number]): number[][] => {
    const [width, height] = size;
    const grid: number[][] = [];
    for (let y = 0; y < height; y++) {
        const row: number[] = [];
        for (let x = 0; x < width; x++) {
            row.push(data[y * width + x] || 0);
        }
        grid.push(row);
    }
    return grid;
};

const analysisDumps = (analysis: any): string[] => {
    const analysisCopy = JSON.parse(JSON.stringify(analysis));
    for (const movedict of Object.values(analysisCopy.moves) as any[]) {
        if ("ownership" in movedict) {
            delete movedict["ownership"];
        }
    }
    const ownershipData = packFloats(analysisCopy.ownership || []);
    const policyData = packFloats(analysisCopy.policy || []);
    delete analysisCopy.ownership;
    delete analysisCopy.policy;
    const mainData = JSON.stringify(analysisCopy);
    return [
        base64.encode(zlib.gzipSync(ownershipData).toString('base64')),
        base64.encode(zlib.gzipSync(policyData).toString('base64')),
        base64.encode(zlib.gzipSync(mainData).toString('base64'))
    ];
};

export class NodeInfo extends NodeExpand {
    autoUndo: boolean | null = null; // None = not analyzed. False: not undone (good move). True: undone (bad move)
    playedMistakeSound: boolean | null = null;
    aiThoughts: string = "";
    note: string = "";
    moveNumber: number = 0;
    timeUsed: number = 0;
    undoThreshold: number = Math.random(); // for fractional undos
    endState: any = null;
    shortcutsTo: [SGFNode<NodeInfo>, SGFNode<NodeInfo>][] = [];
    shortcutFrom: SGFNode<NodeInfo> | null = null;
    analysisFromSgf: string[] | null = null;
    analysisVisitsRequested: number = 0;
    analysis: {
        moves: Record<string, any>;
        root: any;
        ownership: number[] | null;
        policy: number[] | null;
        completed: boolean;
    } = {
        moves: {},
        root: null,
        ownership: null,
        policy: null,
        completed: false
    };
    node! : SGFNode<NodeInfo>;

    constructor() {
        super();
        this.clearAnalysis();
    }

    public SetNode(node : SGFNode<NodeExpand>) {
        this.node = node as SGFNode<NodeInfo>;
    }

    public CreateNodeExpand() : NodeInfo {
        return new NodeInfo();
    }

    addShortcut(toNode: SGFNode<NodeInfo>): void {
        const nodes = [toNode];
        let current = toNode;
        while (current.parent && current.t !== this) {
            current = current.parent as SGFNode<NodeInfo>;
            nodes.push(current);
        }
        if (nodes[nodes.length - 1].t === this && nodes.length > 2) {
            const via = nodes[nodes.length - 2];
            this.shortcutsTo.push([toNode, via]);
            if (toNode.t) {
                toNode.t.shortcutFrom = this.node;
            }
            
        }
    }

    removeShortcut(): void {
        const fromNode = this.shortcutFrom;
        if (fromNode && fromNode.t) {
            fromNode.t.shortcutsTo = fromNode.t.shortcutsTo.filter(([m, v]) => m.t !== this);
            this.shortcutFrom = null;
        }
    }

    loadAnalysis(): boolean {
        if (!this.analysisFromSgf) {
            return false;
        }
        try {
            const [szx, szy] = this.node.root?.boardSize??[19, 19];
            const boardSquares = szx * szy;
            const version = this.node.root?.getProperty("KTV", ANALYSIS_FORMAT_VERSION);
            if (version > ANALYSIS_FORMAT_VERSION) {
                throw new Error(`Can not decode analysis data with version ${version}, please update ${PROGRAM_NAME}`);
            }
            
            // In a real implementation, you would decompress the base64 data
            const [ownershipData, policyData, mainData] = this.analysisFromSgf;
            
            this.analysis = {
                ...JSON.parse(mainData),
                policy: unpackFloats(policyData, boardSquares + 1),
                ownership: unpackFloats(ownershipData, boardSquares),
            };
            return true;
        } catch (e) {
            console.error(`Error in loading analysis: ${e}`);
            return false;
        }
    }

    addListProperty(property: string, values: any[]): void {
        if (property === "KT") {
            this.analysisFromSgf = values as string[];
        } else if (property === "C") {
            const comments = values.flatMap(v => 
                v.split(SGF_SEPARATOR_MARKER)
                 .filter((c: string) => c.trim() && !c.includes(SGF_INTERNAL_COMMENTS_MARKER))
            );
            this.note = comments.join("").trim();
        } else {
            this.node.addListProperty(property, values);
        }
    }

    clearAnalysis(): void {
        this.analysisVisitsRequested = 0;
        this.analysis = {
            moves: {},
            root: null,
            ownership: null,
            policy: null,
            completed: false
        };
    }

    sgfProperties(
        saveCommentsPlayer: Record<string, boolean> | null = null,
        saveCommentsClass: Record<number, boolean> | null = null,
        evalThresholds: number[] | null = null,
        saveAnalysis: boolean = false,
        saveMarks: boolean = false
    ): Record<string, any[]> {
        const properties = this.node.sgfProperties();
        const note = this.note.trim();
        
        if (saveAnalysis && this.analysisComplete) {
            try {
                properties["KT"] = analysisDumps(this.analysis);
            } catch (e) {
                console.error(`Error in saving analysis: ${e}`);
            }
        }
        
        let showClass = false;
        if (this.pointsLost !== null && this.pointsLost !== null && 
            saveCommentsClass && evalThresholds) {
            showClass = saveCommentsClass[evaluationClass(this.pointsLost, evalThresholds)] || false;
        }
        
        const comments = properties["C"] || [];
        
        if (this.node.parent != null && 
            this.node.parent.t.analysisExists && 
            this.analysisExists && 
            (note || ((saveCommentsPlayer?.[this.node.player] || false) && showClass))) {
            
            if (saveMarks) {
                const candidateMoves = this.node.parent.t.candidateMoves;
                if (candidateMoves.length > 0) {
                    const topX = Move.fromGtp(candidateMoves[0]["move"]).sgf(this.node.boardSize);
                    const bestSq = candidateMoves
                        .filter(d => d["pointsLost"] <= 0.5 && d["move"] !== "pass" && d["order"] !== 0)
                        .map(d => Move.fromGtp(d["move"]).sgf(this.node.boardSize));
                    
                    if (bestSq.length > 0 && !properties["SQ"]) {
                        properties["SQ"] = bestSq;
                    }
                    if (topX && !properties["MA"]) {
                        properties["MA"] = [topX];
                    }
                }
            }
            comments.push("\n" + this.comment(true, false) + SGF_INTERNAL_COMMENTS_MARKER);
        }
        
        if (this.node.isRoot) {
            const rootComments = saveMarks ? 
                [i18n._("SGF start message") + SGF_INTERNAL_COMMENTS_MARKER + "\n"] : [];
            
            rootComments.push(
                ...rootComments,
                `\nSGF generated by ${PROGRAM_NAME} ${VERSION}${SGF_INTERNAL_COMMENTS_MARKER}\n`
            );
            
            properties["CA"] = ["UTF-8"];
            properties["AP"] = [`${PROGRAM_NAME}:${VERSION}`];
            properties["KTV"] = [ANALYSIS_FORMAT_VERSION];
        }
        
        if (this.shortcutFrom) {
            properties["KTSF"] = [this.shortcutFrom.t.id.toString()];
        } else if (properties["KTSF"]) {
            delete properties["KTSF"];
        }
        
        if (this.shortcutsTo.length > 0) {
            properties["KTSID"] = [this.id.toString()];
        } else if (properties["KTSID"]) {
            delete properties["KTSID"];
        }
        
        if (note) {
            comments.unshift(`${this.note}\n`);
        }
        
        if (comments.length > 0) {
            properties["C"] = [comments.join(SGF_SEPARATOR_MARKER).trim()];
        } else if (properties["C"]) {
            delete properties["C"];
        }
        
        return properties;
    }

    static orderChildren(children: SGFNode<NodeInfo>[]): SGFNode<NodeInfo>[] {
        return children.sort((a, b) => {
            if (a.t.autoUndo === null && b.t.autoUndo === null) return 0;
            if (a.t.autoUndo === null) return -1;
            if (b.t.autoUndo === null) return 1;
            return (a.t.autoUndo ? 1 : 0) - (b.t.autoUndo ? 1 : 0);
        });
    }

    // various analysis functions
    analyze(
        {
            engine = undefined ,
            priority = PRIORITY_DEFAULT,
            visits = 0,
            ponder = false,
            timeLimit = true,
            analyzeFast = false,
            findAlternatives = false,
            regionOfInterest = undefined,
            reportEvery = REPORT_DT,
            refineMove = undefined
        }:
        {
            engine?: KataGoEngineInterface,
            priority?: number,
            visits?: number,
            ponder?: boolean,
            timeLimit?: boolean,
            refineMove?: Move,
            analyzeFast?: boolean,
            findAlternatives?: boolean,
            regionOfInterest?: [number, number, number, number],
            reportEvery?: number
        }
    ): void {
        engine?.requestAnalysis(
            {
                node: this.node,
                callback : (result: any, partialResult: boolean) => this.setAnalysis(result, refineMove, findAlternatives, regionOfInterest, partialResult),
                priority: priority,
                analyzeFast: analyzeFast,
                visits : visits,
                ponder : ponder,
                regionOfInterest: regionOfInterest,
                timeLimit: timeLimit,
                nextMove : refineMove,
                findAlternatives : findAlternatives,
                reportEvery : reportEvery,
                includePolicy : false
            }
        );
    }

    updateMoveAnalysis(moveAnalysis: any, moveGtp: string): void {
        let cur = this.analysis.moves[moveGtp];
        if (cur === undefined) {
            this.analysis.moves[moveGtp] = {
                move: moveGtp,
                order: ADDITIONAL_MOVE_ORDER,
                ...moveAnalysis,
            };
        } else {
            cur.order = Math.min(
                cur.order, 
                moveAnalysis.order !== undefined ? moveAnalysis.order : ADDITIONAL_MOVE_ORDER
            );
            if (cur.visits < moveAnalysis.visits) {
                Object.assign(cur, moveAnalysis);
            } else {
                // prior etc only
                for (const [k, v] of Object.entries(moveAnalysis)) {
                    if (!(k in cur)) {
                        cur[k] = v;
                    }
                }
            }
        }
    }

    setAnalysis(
        analysisJson: any,
        refineMove: Move | null = null,
        additionalMoves: boolean | string = false,
        regionOfInterest: number[] | null = null,
        partialResult: boolean = false
    ): void {
        if (refineMove) {
            const pvtail = analysisJson.moveInfos[0]?.pv || [];
            this.updateMoveAnalysis(
                { pv: [refineMove.gtp(), ...pvtail], ...analysisJson.rootInfo }, 
                refineMove.gtp()
            );
        } else {
            if (additionalMoves) {
                // additional moves: old order matters, ignore new order
                for (const m of analysisJson.moveInfos) {
                    delete m.order;
                }
            } else if (refineMove === null) {
                // normal update: old moves to end, new order matters
                for (const moveDict of Object.values(this.analysis.moves)) {
                    (moveDict as any).order = ADDITIONAL_MOVE_ORDER;
                }
            }
            
            for (const moveAnalysis of analysisJson.moveInfos) {
                this.updateMoveAnalysis(moveAnalysis, moveAnalysis.move);
            }
            
            this.analysis.ownership = analysisJson.ownership || null;
            this.analysis.policy = analysisJson.policy || null;
            
            if (!additionalMoves && !regionOfInterest) {
                this.analysis.root = analysisJson.rootInfo;
                if (this.node.parent && this.node.move) {
                    const pv = analysisJson.moveInfos[0]?.pv || [];
                    analysisJson.rootInfo.pv = [this.node.move.gtp(), ...pv];
                    this.node.parent.t.updateMoveAnalysis(
                        analysisJson.rootInfo, 
                        this.node.move.gtp()
                    );
                }
            }
            
            const isNormalQuery = refineMove === null && !additionalMoves;
            this.analysis.completed = this.analysis.completed || (isNormalQuery && !partialResult);
        }
    }

    waitForAnalysis(tag: string): Promise<void> {
        console.log(`[${tag}] Waiting for regular analysis to complete...`, OUTPUT_DEBUG);
        return new Promise((resolve) => {
            const checkCompletion = () => {
                if (this.analysisComplete) {
                    console.log(`[${tag}] Regular analysis completed`, OUTPUT_DEBUG);
                    resolve();
                } else {
                    setTimeout(checkCompletion, 10);
                }
            };
            checkCompletion();
        });
    }

    get ownership(): number[] | null {
        return this.analysis.ownership;
    }

    get lossOwnership(): number[] | null {
        let tmp = this.node.move.player == "B" ? 1 : -1;
        return this.ownership.map((c, i) =>(tmp *  c - this.node.parent!.t.ownership![i]))
    }

    get policy(): number[] | null {
        return this.analysis.policy;
    }

    get analysisExists(): boolean {
        return this.analysis.root !== null;
    }

    get analysisComplete(): boolean {
        return this.analysis.completed && this.analysis.root !== null;
    }

    get rootVisits(): number {
        return this.analysis.root?.visits || 0;
    }

    get score(): number | null {
        if (this.analysisExists) {
            return this.analysis.root.scoreLead;
        }
        return null;
    }

    formatScore(score: number | null = null): string | null {
        score = score !== null ? score : this.score;
        if (score !== null) {
            const leadingPlayer = score >= 0 ? 'B' : 'W';
            const leadingPlayerColor = i18n._(`short color ${leadingPlayer}`);
            return `${leadingPlayerColor}+${Math.abs(score).toFixed(1)}`;
        }
        return null;
    }

    get winrate(): number | null {
        if (this.analysisExists) {
            return this.analysis.root.winrate;
        }
        return null;
    }

    formatWinrate(winRate: number | null = null): string | null {
        winRate = winRate !== null ? winRate : this.winrate;
        if (winRate !== null) {
            const leadingPlayer = winRate > 0.5 ? 'B' : 'W';
            const leadingPlayerColor = i18n._(`short color ${leadingPlayer}`);
            return `${leadingPlayerColor} ${Math.max(winRate, 1 - winRate).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 1 })}`;
        }
        return null;
    }

    movePolicyStats(): [number | null, number, any[]] {
        const singleMove = this.node.move;
        if (singleMove && this.node.parent) {
            const policyRanking = this.policyRanking;
            if (policyRanking) {
                for (let ix = 0; ix < policyRanking.length; ix++) {
                    const [p, m] = policyRanking[ix];
                    if (m.equals(singleMove)) {
                        return [ix + 1, p, policyRanking];
                    }
                }
            }
        }
        return [null, 0.0, []];
    }

    makePv(player: string, pv: string[], interactive: boolean): string {
        let pvtext = `${player}${pv.join(' ')}`;
        if (interactive) {
            pvtext = `[u][ref=${pvtext}][color=${Theme.INFO_PV_COLOR}]${pvtext}[/color][/ref][/u]`;
        }
        return pvtext;
    }

    comment(sgf: boolean = false, teach: boolean = false, details: boolean = false, interactive: boolean = true): string {
        const singleMove = this.node.move;
        if (!this.node.parent || !singleMove) { // root
            if (this.node.root) {
                let rules = this.node.getProperty("RU", "Japanese");
                if (typeof rules === 'string') {
                    rules = i18n._(rules.toLowerCase());
                }
                return `${i18n._('komi')}: ${this.node.komi.toFixed(1)}\n${i18n._('ruleset')}: ${rules}\n`;
            }
            return "";
        }

        let text = i18n.format(i18n._("move"), { number: this.node.depth }) + `: ${singleMove.player} ${singleMove.gtp()}\n`;
        if (this.analysisExists) {
            const score = this.score;
            if (sgf) {
                text += i18n.format(i18n._("Info:score"), { score: this.formatScore(score) }) + "\n";
                text += i18n.format(i18n._("Info:winrate"), { winrate: this.formatWinrate() }) + "\n";
            }
            if (this.node.parent && this.analysisExists) {
                const previousTopMove = this.node.parent.t.candidateMoves[0];
                if (sgf || details) {
                    if (previousTopMove.move !== singleMove.gtp()) {
                        const pointsLost = this.pointsLost;
                        if (sgf && pointsLost && pointsLost > 0.5) {
                            text += i18n.format(i18n._("Info:point loss"), { points_lost: pointsLost }) + "\n";
                        }
                        const topMove = previousTopMove.move;
                        const scoreText = this.formatScore(previousTopMove.scoreLead);
                        text += i18n.format(i18n._("Info:top move"), {
                            top_move: topMove,
                            score: scoreText,
                        }) + "\n";
                    } else {
                        text += i18n._("Info:best move") + "\n";
                    }
                    if (previousTopMove.pv && (sgf || details)) {
                        const pv = this.makePv(singleMove.player, previousTopMove.pv, interactive);
                        text += i18n.format(i18n._("Info:PV"), { pv }) + "\n";
                    }
                }
                if (sgf || details || teach) {
                    const [currmovePolRank, currmovePolProb, policyRanking] = this.movePolicyStats();
                    if (currmovePolRank !== null) {
                        const policyRankMsg = i18n._("Info:policy rank");
                        text += i18n.format(policyRankMsg, { rank: currmovePolRank, probability: currmovePolProb }) + "\n";
                    }
                    if (currmovePolRank !== 1 && policyRanking.length > 0 && (sgf || details)) {
                        const policyBestMsg = i18n._("Info:policy best");
                        const polMove = policyRanking[0][1].gtp();
                        const polProb = policyRanking[0][0];
                        text += i18n.format(policyBestMsg, { move: polMove, probability: polProb }) + "\n";
                    }
                }
            }
            if (this.autoUndo && sgf) {
                text += i18n._("Info:teaching undo") + "\n";
                const topPv = this.analysisExists && this.candidateMoves[0].pv;
                if (topPv) {
                    text += i18n.format(i18n._("Info:undo predicted PV"), { 
                        pv: `${this.node.nextPlayer} ${topPv.join(' ')}` 
                    }) + "\n";
                }
            }
        } else {
            text = sgf ? i18n._("No analysis available") : i18n._("Analyzing move...");
        }

        if (this.aiThoughts && (sgf || details)) {
            text += "\n" + i18n.format(i18n._("Info:AI thoughts"), { thoughts: this.aiThoughts });
        }

        if (this.node.properties.has("C")) {
            text += "\n[u]SGF Comments:[/u]\n" + this.node.properties.get("C")!.join("\n");
        }

        return text;
    }

    get pointsLost(): number | null {
        const singleMove = this.node.move;
        if (singleMove && this.node.parent && this.analysisExists && this.node.parent.t.analysisExists) {
            const parentScore = this.node.parent.t.score;
            const score = this.score;
            if (parentScore !== null && score !== null) {
                return NodeInfo.playerSign(singleMove.player) * (parentScore - score);
            }
        }
        return null;
    }

    get parentRealizedPointsLost(): number | null {
        const singleMove = this.node.move;
        if (singleMove && 
            this.node.parent && 
            this.node.parent.parent && 
            this.analysisExists && 
            this.node.parent.parent.t.analysisExists) {
            const parentParentScore = this.node.parent.parent.t.score;
            const score = this.score;
            if (parentParentScore !== null && score !== null) {
                return NodeInfo.playerSign(singleMove.player) * (score - parentParentScore);
            }
        }
        return null;
    }

    static playerSign(player: string): number {
        return { "B": 1, "W": -1, "": 0 }[player] || 0;
    }

    get candidateMoves(): {[key:string]:any}[] {
        if (!this.analysisExists) {
            return [];
        }
        if (Object.keys(this.analysis.moves).length === 0) {
            const polmoves = this.policyRanking;
            const topPolmove = polmoves.length > 0 ? polmoves[0][1] : new Move(undefined); // if no info at all, pass
            return [
                {
                    ...this.analysis.root,
                    pointsLost: 0,
                    winrateLost: 0,
                    order: 0,
                    move: topPolmove.gtp(),
                    pv: [topPolmove.gtp()],
                }
            ]; // single visit -> go by policy/root
        }

        const rootScore = this.analysis.root.scoreLead;
        const rootWinrate = this.analysis.root.winrate;
        const moveDicts = Object.values(this.analysis.moves); // prevent incoming analysis from causing crash
        const topMove = moveDicts.filter((d: any) => d.order === 0);
        const topScoreLead = topMove.length > 0 ? topMove[0].scoreLead : rootScore;
        
        return moveDicts
            .map((d: any) => ({
                pointsLost: NodeInfo.playerSign(this.node.nextPlayer) * (rootScore - d.scoreLead),
                relativePointsLost: NodeInfo.playerSign(this.node.nextPlayer) * (topScoreLead - d.scoreLead),
                winrateLost: NodeInfo.playerSign(this.node.nextPlayer) * (rootWinrate - d.winrate),
                ...d,
            }))
            .sort((a: any, b: any) => {
                if (a.order !== b.order) {
                    return a.order - b.order;
                }
                return a.pointsLost - b.pointsLost;
            });
    }

    get policyRanking(): [number, Move][] {
        if (!this.policy) {
            return [];
        }
        const [szx, szy] = this.node.boardSize;
        const policyGrid = varToGrid(this.policy, [szx, szy]);
        const moves: [number, Move][] = [];
        
        for (let x = 0; x < szx; x++) {
            for (let y = 0; y < szy; y++) {
                moves.push([policyGrid[y][x], new Move([x, y], this.node.nextPlayer)]);
            }
        }
        
        moves.push([this.policy[this.policy.length - 1], new Move(undefined, this.node.nextPlayer)]);
        
        return moves.sort((a, b) => b[0] - a[0]);
    }

    // Helper property for identification
    private get id(): number {
        return parseInt(Math.random().toString().substring(2));
    }
}