// 导入语句需要根据实际项目结构调整
import * as fs from 'fs';
import * as path from 'path';
import config from './config';

// 假设这些是从其他模块导入的常量和类型
import {
	OUTPUT_DEBUG,
	OUTPUT_EXTRA_DEBUG,
	OUTPUT_INFO,
	PLAYER_AI,
	PLAYER_HUMAN,
	PROGRAM_NAME,
	SGF_INTERNAL_COMMENTS_MARKER,
	STATUS_ANALYSIS,
	STATUS_ERROR,
	STATUS_INFO,
	STATUS_TEACHING,
	PRIORITY_GAME_ANALYSIS,
	PRIORITY_EXTRA_ANALYSIS,
	PRIORITY_SWEEP,
	PRIORITY_ALTERNATIVES,
	PRIORITY_EQUALIZE,
	PRIORITY_DEFAULT,
	REPORT_DT,
	OUTPUT_ERROR,
	OUTPUT_KATAGO_STDERR
} from './constants';

import { NodeInfo } from './nodeInfo';
import { SGF, Move, SGFNode } from './sgfParser';
import { varToGrid, weightedSelectionWithoutReplacement } from './utils';
import { Player } from './player';
import { aiRankEstimation, generateAiMove } from './ai';
import { KataGoEngineInterface } from './katagoAnalysis';

// 自定义错误类
class IllegalMoveException extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'IllegalMoveException';
	}
}

// 基础游戏类
class BaseAnalysisEngine {
	// 类常量
	static DEFAULT_PROPERTIES: { [key: string]: number } = { "GM": 1, "FF": 4 };

	config: Record<string, any> = {};
	// 实例属性
	gameId!: string;
	sgfFilename!: string | null;

	insertMode!: boolean;
	externalGame!: boolean;

	root!: SGFNode<NodeInfo>;
	currentNode!: SGFNode<NodeInfo>;
	mainTimeUsed!: number;

	// 游戏状态相关
	board: number[][] = [];
	chains: Move[][] = [];
	prisoners: Move[] = [];
	lastCapture: Move[] = [];

	playersInfo!: { [key: string]: Player };

	updateStateCall: Function | undefined;
	updateMoveTreeCall: Function | undefined;
	updateMoveTreeInsertNodeCall: Function | undefined;
	updatePonderingCall: Function | undefined;

	loggerFunction: ((level: string, msg: string) => void) | undefined;

	constructor() {

	}

	public InitEngine(
		{
			moveTree = null,
			analyzeFast = false,
			gameProperties = null,
			sgfFilename = null,
			bypassConfig = false
		}: {
			moveTree?: SGFNode<NodeInfo> | null,
			analyzeFast?: boolean,
			gameProperties?: { [key: string]: any } | null,
			sgfFilename?: string | null,
			bypassConfig?: boolean
		}
	): void {

		this.config = JSON.parse(JSON.stringify(config));

		this.currentNode = new SGFNode<NodeInfo>();
		this.gameId = (new Date()).toDateString();
		this.sgfFilename = sgfFilename;

		this.insertMode = false;
		this.externalGame = false;

		this.playersInfo = {
			"B": new Player("B"),
			"W": new Player("W")
		};

		if (moveTree) {
			this.root = moveTree;
			this.externalGame = !this.root.getProperty("AP", "").includes(PROGRAM_NAME);

			const handicap = parseInt(this.root.handicap.toString());
			let numStartingMovesBlack = 0;
			let node: SGFNode<NodeInfo> | null = this.root;

			while (node.children && node.children.length > 0) {
				node = node.children[0];
				if (node.player === "B") {
					numStartingMovesBlack++;
				} else {
					break;
				}
			}

			if (
				handicap >= 2 &&
				!this.root.placements &&
				numStartingMovesBlack !== handicap &&
				!(this.root.children && this.root.children.length > 0 && this.root.children[0].placements)
			) {
				this.root.placeHandicapStones(handicap);
			}
		} else {
			const defaultProperties = {
				...BaseAnalysisEngine.DEFAULT_PROPERTIES,
				"DT": this.gameId
			};

			if (!bypassConfig) {
				Object.assign(defaultProperties, {
					"SZ": this.config.game.size,
					"KM": this.config.game.komi,
					"RU": this.config.game.rules,
				});
			}

			this.root = new SGFNode<NodeInfo>(new NodeInfo(), null, 
				{
					...defaultProperties,
					...(gameProperties || {}),
				}
			);

			console.log("this.root.properties ==" , JSON.stringify(this.root.properties));

			const handicap = this.config.game.handicap;
			if (!bypassConfig && handicap) {
				this.root.placeHandicapStones(handicap);
			}
		}

		if (!this.root.getProperty("RU")) {
			this.root.setProperty("RU", this.config.game.rules);
		}

		this.setCurrentNode(this.root);
		this.mainTimeUsed = 0;

		// restore shortcuts
		const shortcutIdToNode: { [key: string]: SGFNode<NodeInfo> } = {};
		for (const node of this.root.nodesInTree) {
			const ktsid = node.getProperty("KTSID", null);
			if (ktsid !== null) {
				shortcutIdToNode[ktsid] = <SGFNode<NodeInfo>>node;
			}
		}

		for (const node of this.root.nodesInTree) {
			const shortcutId = node.getProperty("KTSF", null);
			if (shortcutId && shortcutIdToNode[shortcutId]) {
				shortcutIdToNode[shortcutId].t.addShortcut(<SGFNode<NodeInfo>>node);
			}
		}

	}

	// -- move tree functions --
	private initState(): void {
		const [boardSizeX, boardSizeY] = this.boardSize;
		this.board = Array.from({ length: boardSizeY }, () =>
			Array.from({ length: boardSizeX }, () => -1)
		);
		this.chains = [];
		this.prisoners = [];
		this.lastCapture = [];
	}

	public calculateGroups(): void {
		// 使用锁机制保护临界区
		// this._lock.acquire(() => {
		this.initState();
		try {
			for (const node of this.currentNode.nodesFromRoot) {
				for (const m of node.moveWithPlacements) {
					this.validateMoveAndUpdateChains(m, true);
				}

				if (node.clearPlacements) {
					const clearCoords = new Set(
						node.clearPlacements.map(c => JSON.stringify(c.coords))
					);

					const stones: Move[] = [];
					for (const chain of this.chains) {
						for (const m of chain) {
							if (!clearCoords.has(JSON.stringify(m.coords))) {
								stones.push(m);
							}
						}
					}

					this.initState();
					for (const m of stones) {
						this.validateMoveAndUpdateChains(m, true);
					}
				}
			}
		} catch (e) {
			if (e instanceof IllegalMoveException) {
				throw new Error(`Unexpected illegal move (${e.message})`);
			}
			throw e;
		}
		// });
	}

	public validateMoveAndUpdateChains(move: Move, ignore_ko: boolean): void {
		const [boardSizeX, boardSizeY] = this.boardSize;

		const neighbours = (moves: Move[]): Set<number> => {
			const result = new Set<number>();
			for (const m of moves) {
				for (const [dy, dx] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
					const x = m.coords[0] + dx;
					const y = m.coords[1] + dy;
					if (x >= 0 && x < boardSizeX && y >= 0 && y < boardSizeY) {
						result.add(this.board[y][x]);
					}
				}
			}
			return result;
		};

		const koOrSnapback = this.lastCapture.length === 1 &&
			this.lastCapture[0] === move;
		this.lastCapture = [];

		if (move.isPass) {
			return;
		}

		if (this.board[move.coords[1]][move.coords[0]] !== -1) {
			throw new IllegalMoveException("Space occupied");
		}

		// merge chains connected by this move, or create a new one
		const nb_chains_set = new Set(
			[...neighbours([move])].filter(c =>
				c >= 0 && this.chains[c][0].player === move.player
			)
		);
		const nb_chains = Array.from(nb_chains_set);

		let this_chain: number;
		if (nb_chains.length > 0) {
			this_chain = nb_chains[0];
			this.board = this.board.map(line =>
				line.map(sq => nb_chains.includes(sq) ? nb_chains[0] : sq)
			);

			for (const oc of nb_chains.slice(1)) {
				this.chains[nb_chains[0]].push(...this.chains[oc]);
				this.chains[oc] = [];
			}
			this.chains[nb_chains[0]].push(move);
		} else {
			this_chain = this.chains.length;
			this.chains.push([move]);
		}
		this.board[move.coords[1]][move.coords[0]] = this_chain;

		// check captures
		const oppNbChainsSet = new Set(
			[...neighbours([move])].filter(c =>
				c >= 0 && this.chains[c][0].player !== move.player
			)
		);
		const oppNbChains = Array.from(oppNbChainsSet);

		for (const c of oppNbChains) {
			const chainNeighbours = neighbours(this.chains[c]);
			if (!chainNeighbours.has(-1)) { // no liberties
				this.lastCapture.push(...this.chains[c]);
				for (const om of this.chains[c]) {
					this.board[om.coords[1]][om.coords[0]] = -1;
				}
				this.chains[c] = [];
			}
		}

		if (koOrSnapback && this.lastCapture.length === 1 && !ignore_ko) {
			throw new IllegalMoveException("Ko");
		}
		this.prisoners.push(...this.lastCapture);

		// suicide: check rules and throw exception if needed
		const thisChainNeighbours = neighbours(this.chains[this_chain]);
		if (!thisChainNeighbours.has(-1)) {
			const rules = this.rules;
			if (this.chains[this_chain].length === 1) {
				throw new IllegalMoveException("Single stone suicide");
			} else if (
				(typeof rules === "string" && ["tromp-taylor", "new zealand"].includes(rules)) ||
				(typeof rules === "object" && (rules as { [key: string]: any }).suicide)
			) {
				this.lastCapture.push(...this.chains[this_chain]);
				for (const om of this.chains[this_chain]) {
					this.board[om.coords[1]][om.coords[0]] = -1;
				}
				this.chains[this_chain] = [];
				this.prisoners.push(...this.lastCapture);
			} else {
				throw new IllegalMoveException("Suicide");
			}
		}
	}

	// Play a Move from the current position, raise IllegalMoveException if invalid.
	async play(move: Move, ignore_ko: boolean = false): Promise<SGFNode<NodeInfo>> {
		const [boardSizeX, boardSizeY] = this.boardSize;

		if (!move.isPass &&
			!(move.coords[0] >= 0 && move.coords[0] < boardSizeX &&
				move.coords[1] >= 0 && move.coords[1] < boardSizeY)) {
			throw new IllegalMoveException(`Move ${move} outside of board coordinates`);
		}

		try {
			this.validateMoveAndUpdateChains(move, ignore_ko);
		} catch (e) {
			if (e instanceof IllegalMoveException) {
				this.calculateGroups();
				throw e;
			}
		}

		// this._lock.acquire(() => {
		const playedNode = this.currentNode.play(move);
		this.currentNode = playedNode;
		// });

		return playedNode;
	}

	// Insert a list of moves from root, often just adding one.
	syncBranch(moves: Move[]): SGFNode<NodeInfo> {
		let node = this.root;
		// this._lock.acquire(() => {
		for (const move of moves) {
			node = node.play(move);
		}
		// });
		return node;
	}

	setCurrentNode(node: SGFNode<NodeInfo>): void {
		this.currentNode = node;
		this.calculateGroups();
	}

	undo(nTimes: number | "branch" | "main-branch" = 1, stop_on_mistake: number | null = null): void {
		let breakOnBranch = false;
		let cn = this.currentNode; // avoid race conditions
		let breakOnMainBranch = false;
		let lastBranchingNode = cn;

		if (nTimes === "branch") {
			nTimes = 9999;
			breakOnBranch = true;
		} else if (nTimes === "main-branch") {
			nTimes = 9999;
			breakOnMainBranch = true;
		}

		for (let move = 0; move < nTimes; move++) {
			if (
				stop_on_mistake !== null &&
				cn.t.pointsLost !== null &&
				cn.t.pointsLost >= stop_on_mistake &&
				this.playersInfo[cn.player].playerType !== PLAYER_AI
			) {
				if (cn.parent)
					this.setCurrentNode(cn.parent);
				return;
			}

			const previous_cn = cn;
			if (cn.t.shortcutFrom) {
				cn = cn.t.shortcutFrom;
			} else if (!cn.isRoot) {
				if (cn.parent)
					cn = cn.parent;
			} else {
				break; // root
			}

			if (breakOnBranch && cn.children.length > 1) {
				break;
			} else if (breakOnMainBranch && cn.orderedChildren[0] !== previous_cn) {
				lastBranchingNode = cn;
			}
		}

		if (breakOnMainBranch) {
			cn = lastBranchingNode;
		}

		if (cn !== this.currentNode) {
			this.setCurrentNode(cn);
		}
	}

	redo(nTimes: number = 1, stopOnMisTake: number | null = null): void {
		let cn = this.currentNode; // avoid race conditions

		for (let move = 0; move < nTimes; move++) {
			if (cn.children.length > 0) {
				let child = cn.orderedChildren[0];

				// are we about to go to a shortcut node?
				const shortcut_to = cn.t.shortcutsTo.filter(([m, v]) => child === v);
				if (shortcut_to.length > 0) {
					child = shortcut_to[0][0];
				}
				cn = child;
			}

			if (
				move > 0 &&
				stopOnMisTake !== null &&
				cn.t.pointsLost !== null &&
				cn.t.pointsLost >= stopOnMisTake &&
				this.playersInfo[cn.player].playerType !== PLAYER_AI
			) {
				if (cn.parent)
					this.setCurrentNode(cn.parent);
				return;
			}
		}

		if (stopOnMisTake === null) {
			this.setCurrentNode(cn);
		}
	}

	// 属性访问器
	get komi(): number {
		return this.root.komi;
	}

	get boardSize(): [number, number] {
		return this.root.boardSize;
	}

	get stones(): Move[] {
		// this._lock.acquire(() => {
		return this.chains.flat();
		// });
	}

	get endResult(): string | undefined {
		if (this.currentNode.t.endState) {
			return this.currentNode.t.endState;
		}

		if (this.currentNode.parent &&
			this.currentNode.isPass &&
			this.currentNode.parent.isPass) {
			return this.manualScore || "对局结束";
		}

		return undefined;
	}

	get prisonerCount(): { [key: string]: number } {
		// returns prisoners that are of a certain colour as {B: black stones captures, W: white stones captures}
		const result: { [key: string]: number } = {};
		for (const player of ["B", "W"]) {
			result[player] = this.prisoners.filter(m => m.player === player).length;
		}
		return result;
	}

	get rules(): any {
		return KataGoEngineInterface.getRules(this.root.ruleset);
	}

	get manualScore(): string | null {
		const rules = this.rules;

		if (
			!this.currentNode.t.ownership ||
			!["jp", "japanese"].includes(String(rules).toLowerCase()) ||
			!this.currentNode.parent ||
			!this.currentNode.parent.t.ownership
		) {
			if (!this.currentNode.t.score) {
				return null;
			}
			return this.currentNode.t.formatScore(Math.round(2 * this.currentNode.t.score) / 2) + "?";
		}

		const [boardSizeX, boardSizeY] = this.boardSize;
		const meanOwnership = this.currentNode.t.ownership.map((c, i) =>
			(c + this.currentNode.parent!.t.ownership![i]) / 2
		);

		const ownership_grid = varToGrid(meanOwnership, [boardSizeX, boardSizeY]);
		const stones: { [key: string]: string } = {};
		for (const m of this.stones) {
			stones[`${m.coords[0]},${m.coords[1]}`] = m.player;
		}

		const loThreshold = 0.15;
		const hiThreshold = 0.85;
		const maxUnknown = 10;
		const maxDame = 4 * (boardSizeX + boardSizeY);

		const japaneseScoreSquare = (square: [number, number], owner: number): number => {
			const player = stones[`${square[0]},${square[1]}`] || null;

			if (
				(player === "B" && owner > hiThreshold) ||
				(player === "W" && owner < -hiThreshold) ||
				Math.abs(owner) < loThreshold
			) {
				return 0; // dame or own stones
			}

			if (player === null && Math.abs(owner) >= hiThreshold) {
				return Math.round(owner); // surrounded empty intersection
			}

			if ((player === "B" && owner < -hiThreshold) ||
				(player === "W" && owner > hiThreshold)) {
				return 2 * Math.round(owner); // captured stone
			}

			return NaN; // unknown!
		};

		const scoredSquares: number[] = [];
		for (let y = 0; y < boardSizeY; y++) {
			for (let x = 0; x < boardSizeX; x++) {
				scoredSquares.push(japaneseScoreSquare([x, y], ownership_grid[y][x]));
			}
		}

		const numSq: { [key: string]: number } = {};
		for (const t of [-2, -1, 0, 1, 2]) {
			numSq[t] = scoredSquares.filter(s => s === t).length;
		}

		const numUnkn = scoredSquares.filter(s => isNaN(s)).length;
		const prisoners = this.prisonerCount;
		const score = Object.entries(numSq).reduce((sum, [t, n]) =>
			sum + parseInt(t) * (n as number), 0) +
			prisoners["W"] - prisoners["B"] - this.komi;

		this.consoleLog(
			`Manual Scoring: ${JSON.stringify(numSq)} score by square with ${numUnkn} unknown, ${JSON.stringify(prisoners)} captures, and ${this.komi} komi -> score = ${score}`,
			OUTPUT_DEBUG,
		);

		if (numUnkn > maxUnknown || (numSq[0] - Object.keys(stones).length) > maxDame) {
			return null;
		}

		return this.currentNode.t.formatScore(score);
	}

	toString(): string {
		return (
			this.board.map(line =>
				line.map(c => c >= 0 ? this.chains[c][0].player : "-").join("")
			).join("\n") +
			`\ncaptures: ${JSON.stringify(this.prisonerCount)}`
		);
	}

	updateRootProperties(): void {
		const playerName = (playerInfo: Player): string => {
			if (playerInfo.name && playerInfo.playerType === PLAYER_HUMAN) {
				return playerInfo.name;
			} else {
				return `Rebot`;
			}
		};

		const rootProperties = this.root.properties;
		const xProperties: { [key: string]: string } = {};

		for (const bw of ["B", "W"]) {
			if (!this.externalGame) {
				xProperties["P" + bw] = playerName(this.playersInfo[bw]);
				const playerInfo = this.playersInfo[bw];
				if (playerInfo.playerType === PLAYER_AI) {
					xProperties[bw + "R"] = `${playerInfo.calculatedRank}${playerInfo.calculatedRank! >= 0.5 ? "段位" : "级位"}`;
				}
			}
		}

		if (this.endResult && String(this.endResult).includes("+")) {
			xProperties["RE"] = this.endResult;
		}

		this.root.properties = {
			...rootProperties,
			...Object.fromEntries(
				Object.entries(xProperties).map(([k, v]) => [k, [v]])
			)
		};
	}

	generateFilename(): string {
		this.updateRootProperties();

		const playerNames: { [key: string]: string } = {};
		for (const bw of ["B", "W"]) {
			playerNames[bw] = this.root.getProperty("P" + bw, bw)
				.replace(/[\u200b\u3164'<>:"/\\|?*]/g, "");
		}

		const baseGameName = `${PROGRAM_NAME}_${playerNames['B']} vs ${playerNames['W']}`;
		return `${baseGameName} ${this.gameId}.sgf`;
	}

	writeSgf(filename: string, trainerConfig: { [key: string]: any } | null = null): string {
		if (trainerConfig == null) {
			trainerConfig = this.config.trainer || {};
		}
		if (trainerConfig == null) {
			return "";
		}
		const saveFeedback = trainerConfig.saveFeedback || false;
		const evalThresholds = trainerConfig.evalThresholds;
		const saveAnalysis = trainerConfig.saveAnalysis || false;
		const saveMarks = trainerConfig.saveMarks || false;

		this.updateRootProperties();

		const showDotsFor: { [key: string]: boolean } = {};
		for (const bw of ["B", "W"]) {
			showDotsFor[bw] = (trainerConfig.evalShowAi || true) ||
				this.playersInfo[bw].human;
		}

		const sgf = this.root.sgf(
			showDotsFor,
			saveFeedback,
			evalThresholds,
			saveAnalysis,
			saveMarks,
		);

		this.sgfFilename = filename;
		fs.mkdirSync(path.dirname(filename), { recursive: true });

		fs.writeFileSync(filename, sgf, { encoding: "utf-8" });

		return `带分析的SGF文件保存到 ${filename}`;
	}

	updateState(updateBoard: boolean = false): void {
		if (this.updateStateCall)
			this.updateStateCall(updateBoard);
	}

	updateMoveTree() {
		if (this.updateMoveTreeCall)
			this.updateMoveTreeCall();

	}

	updateMoveTreeInsertNode(node: SGFNode<NodeInfo> | null) {
		if (this.updateMoveTreeInsertNodeCall)
			this.updateMoveTreeInsertNodeCall(node);
	}

	updatePondering(value: boolean) {
		if (this.updatePonderingCall)
			this.updatePonderingCall(value);
	}

	consoleLog(message: string, level: number = OUTPUT_DEBUG): void {
		if (this.loggerFunction) {
			let levelStr = "";
			switch (level) {
				case OUTPUT_ERROR:
					levelStr = "error";
					break;
				case OUTPUT_KATAGO_STDERR:
					levelStr = "error";
					break;
				case OUTPUT_INFO:
					levelStr = "info";
					break;
				case OUTPUT_DEBUG:
					levelStr = "debug";
					break;
				case OUTPUT_EXTRA_DEBUG:
					levelStr = "debug";
					break;
			}
			this.loggerFunction(levelStr, message);
		}
	}
}

// 扩展游戏类，包含分析功能
class AnalysisEngine extends BaseAnalysisEngine {

	engines!: { [key: string]: KataGoEngineInterface };
	insertAfter!: SGFNode<NodeInfo> | null;
	regionOfInterest!: [number, number, number, number] | null;

	constructor(engine: { [key: string]: KataGoEngineInterface } | KataGoEngineInterface) {
		super();
		if (!(engine instanceof Object && !(engine instanceof Array))) { // 检查是否为字典
			this.engines = { "B": engine as KataGoEngineInterface, "W": engine as KataGoEngineInterface };
		} else {
			this.engines = engine as { [key: string]: KataGoEngineInterface };
		}
		for (var key in this.engines) {
			this.engines[key].setEngine(this);
			this.engines[key].setEngineKey(key);
		}
	}

	public InitEngine(
		{
			moveTree = null,
			analyzeFast = false,
			gameProperties = null,
			sgfFilename = null,
			bypassConfig = false
		}:
			{
				moveTree?: SGFNode<NodeInfo> | null,
				analyzeFast?: boolean,
				gameProperties?: { [key: string]: any } | null,
				sgfFilename?: string | null,
				bypassConfig?: boolean
			}
	) {
		super.InitEngine(
			{
				moveTree: moveTree,
				analyzeFast: analyzeFast,
				gameProperties: gameProperties,
				sgfFilename: sgfFilename,
				bypassConfig: bypassConfig
			}
		);

		for (var key in this.engines) {
			this.engines[key].setConfig(this.config.engine);
		}

		this.insertMode = false;
		this.insertAfter = null;
		this.regionOfInterest = null;

		// 启动分析线程
		// 在实际TS环境中可能需要使用Web Workers或其他异步机制
		// 这里简化处理
		setTimeout(() => {
			this.analyzeAllNodes(PRIORITY_GAME_ANALYSIS, analyzeFast, false);
		}, 0);
	}

	analyzeAllNodes(
		priority: number = PRIORITY_GAME_ANALYSIS,
		analyzeFast: boolean = false,
		evenIfPresent: boolean = true
	): void {
		for (const node of this.root.nodesInTree) {
			// forced, or not present, or something went wrong in loading
			if (evenIfPresent || !node.t.analysisFromSgf || !node.t.loadAnalysis()) {
				node.t.clearAnalysis();
				node.t.analyze(
					{
						engine: this.engines[node.nextPlayer],
						priority: priority,
						analyzeFast: analyzeFast,
					}
				);
			}
		}
	}

	setCurrentNode(node: SGFNode<NodeInfo>): void {
		if (this.insertMode) {
			this.consoleLog(`此功能在嵌入模式无法使用， 按 i 结束嵌入 `);
			return;
		}
		super.setCurrentNode(node);
	}

	undo(n_times: number | "branch" | "main-branch" = 1, stop_on_mistake: number | null = null): void {
		if (this.insertMode) { // in insert mode, undo = delete
			const cn = this.currentNode; // avoid race conditions
			if (n_times === 1 && !this.insertAfter!.nodesFromRoot.includes(cn)) {
				cn!.parent!.children = cn!.parent!.children.filter(c => c !== cn);
				this.currentNode = cn.parent!;
				this.calculateGroups();
			}
			return;
		}
		super.undo(n_times, stop_on_mistake);
	}

	resetCurrentAnalysis(): void {
		const cn = this.currentNode;
		const engine = this.engines[cn.nextPlayer];
		engine.terminateQueries(cn);
		cn.t.clearAnalysis();
		cn.t.analyze(
			{
				engine: engine,
			}
		);
	}

	redo(n_times: number = 1, stop_on_mistake: number | null = null): void {
		if (this.insertMode) {
			return;
		}
		super.redo(n_times, stop_on_mistake);
	}

	setInsertMode(mode: "toggle" | boolean): void {
		if (mode === "toggle") {
			mode = !this.insertMode;
		}

		if (mode === this.insertMode) {
			return;
		}

		this.insertMode = mode as boolean;

		if (mode) {
			const children = this.currentNode.orderedChildren;
			if (!children || children.length === 0) {
				this.insertMode = false;
			} else {
				this.insertAfter = this.currentNode.orderedChildren[0];
				this.consoleLog(`嵌入模式，按 i 结束嵌入`);
			}
		} else {
			let copyFromNode = this.insertAfter!;
			let copyToNode = this.currentNode;
			let numCopied = 0;

			if (copyToNode !== this.insertAfter!.parent) {
				const aboveInsertionRoot = this.insertAfter!.parent!.nodesFromRoot;
				const alreadyInsertedMoves = copyToNode.nodesFromRoot
					.filter(n => !aboveInsertionRoot.includes(n) && n.move)
					.map(n => n.move!);

				try {
					while (true) {
						for (const m of copyFromNode.moveWithPlacements) {
							if (!alreadyInsertedMoves.includes(m)) {
								this.validateMoveAndUpdateChains(m, true);
								// this inserts
								copyToNode = new SGFNode<NodeInfo>(new NodeInfo(),
									copyToNode,
									JSON.parse(JSON.stringify(copyFromNode.properties))
								);
								numCopied++;
							}
						}

						if (!copyFromNode.children || copyFromNode.children.length === 0) {
							break;
						}

						copyFromNode = copyFromNode.orderedChildren[0];
					}
				} catch (e) {
					if (e instanceof IllegalMoveException) {
						// illegal move = stop
					} else {
						throw e;
					}
				}

				this.calculateGroups(); // recalculate groups
				this.consoleLog(`嵌入完毕， 复制${numCopied}手棋`);
				this.analyzeAllNodes(PRIORITY_GAME_ANALYSIS, true, false);
			} else {
				// this.katrain.controls.set_status("", STATUS_INFO);
				this.consoleLog("清屏");
			}

			this.updateMoveTreeInsertNode(this.insertMode ? this.insertAfter : null)
			this.updateState(true);
		}
	}

	resign() {
		this.currentNode.t.endState = `${this.currentNode.player}+R`
	}

	// Play a Move from the current position, raise IllegalMoveException if invalid.
	async play(move: Move, ignoreKo: boolean = false, analyze: boolean = true): Promise<SGFNode<NodeInfo>> {
		const playedNode = await super.play(move, ignoreKo);

		if (analyze) {
			if (this.regionOfInterest) {
				playedNode.t.analyze(
					{
						engine: this.engines[playedNode.nextPlayer],
						analyzeFast: true
					}
				);
				playedNode.t.analyze(
					{
						engine: this.engines[playedNode.nextPlayer],
						regionOfInterest: this.regionOfInterest
					}
				);
			} else {
				playedNode.t.analyze(
					{
						engine: this.engines[playedNode.nextPlayer]
					}
				);
			}

			await playedNode.t.waitForAnalysis("generateAiMove");
		}

		return playedNode;
	}

	async genMove(node: SGFNode<NodeInfo> | undefined,): Promise<[Move, SGFNode<NodeInfo>] | undefined> {
		if (!node || this.currentNode == node) {
			let mode = this.nextPlayerInfo!.strategy
			let settings = this.config.ai[<keyof typeof this.config.ai>mode];
			if (settings)
				return await generateAiMove(this, mode, settings);
			else
				this.consoleLog(`AI Mode ${mode} not found!`)
		}
		return undefined
	}

	setRegionOfInterest(regionOfInterest: [number, number, number, number]): void {
		const [x1, x2, y1, y2] = regionOfInterest;
		const xmin = Math.min(x1, x2);
		const xmax = Math.max(x1, x2);
		const ymin = Math.min(y1, y2);
		const ymax = Math.max(y1, y2);

		const [szx, szy] = this.boardSize;

		if (!(xmin === xmax && ymin === ymax) &&
			!(xmax - xmin + 1 >= szx && ymax - ymin + 1 >= szy)) {
			this.regionOfInterest = [xmin, xmax, ymin, ymax];
		} else {
			this.regionOfInterest = null;
		}

		this.consoleLog("清屏");
	}

	analyzeExtra(mode: string, kwargs: { [key: string]: any } = {}): void {
		const stones = new Set(
			this.stones.map(s => `${s.coords[0]},${s.coords[1]}`)
		);
		const cn = this.currentNode;

		if (mode === "stop") {
			this.updatePondering(false);
			const engines = new Set(Object.values(this.engines));
			for (const e of engines) {
				e.stopPondering();
				e.terminateQueries(null);
			}
			return;
		}

		const engine = this.engines[cn.nextPlayer];

		if (mode === "ponder") {
			cn.t.analyze(
				{
					engine: engine,
					regionOfInterest: this.regionOfInterest || undefined,
				}
			);
			return;
		}

		if (mode === "extra") {
			const visits = cn.t.analysisVisitsRequested + engine.config["maxVisits"];
			this.consoleLog(`对第 ${visits} 步做额外分析`);
			cn.t.analyze(
				{
					engine: engine,
					visits: visits,
					regionOfInterest: this.regionOfInterest || undefined,
				}
			);
			return;
		}

		if (mode === "game") {
			const nodes = this.root.nodesInTree;
			const onlyMistakes = kwargs.mistakes_only || false;
			const moveRange = kwargs.move_range || null;

			let adjustedMoveRange = moveRange;
			if (moveRange) {
				if (moveRange[1] < moveRange[0]) {
					adjustedMoveRange = [moveRange[1], moveRange[0]];
				}
			}

			const threshold = this.config.trainer.evalThresholds[-4];
			let visits: number;

			if ("visits" in kwargs) {
				visits = kwargs.visits;
			} else {
				const minVisits = Math.min(...nodes.map(node => node.t.analysisVisitsRequested));
				visits = minVisits + engine.config.maxVisits;
			}

			for (const node of nodes) {
				const maxPointLoss = Math.max(
					node.t.pointsLost || 0,
					...node.children.map(c => c.t.pointsLost || 0)
				);

				if (onlyMistakes && maxPointLoss <= threshold) {
					continue;
				}

				if (moveRange &&
					!(node!.depth! - 1 >= adjustedMoveRange[0] &&
						node!.depth! - 1 <= adjustedMoveRange[1])) {
					continue;
				}

				node.t.analyze(
					{
						engine: engine,
						priority: -1_000_000,
						visits: visits,
					}
				);
			}

			if (!moveRange) {
				this.consoleLog(`使用 ${visits}深度全局再分析`);
			} else {
				this.consoleLog(`从 ${adjustedMoveRange[0]} 到 ${adjustedMoveRange[1]} 使用 ${visits} 重新分析`);
			}
			return;
		}

		let analyzeMoves: Move[];
		let visits: number;
		let priority: number;

		if (mode === "sweep") {
			const [boardSizeX, boardSizeY] = this.boardSize;

			if (cn.t.analysisExists) {
				let policyGrid: number[][] | null = null;
				if (cn.t.policy) {
					policyGrid = varToGrid(cn.t.policy, [boardSizeX, boardSizeY]);
				}

				const moves: { move: Move, policy: number }[] = [];
				for (let x = 0; x < boardSizeX; x++) {
					for (let y = 0; y < boardSizeY; y++) {
						if ((policyGrid === null && !stones.has(`${x},${y}`)) ||
							(policyGrid !== null && policyGrid[y][x] >= 0)) {
							moves.push({
								move: new Move([x, y], cn.nextPlayer),
								policy: policyGrid ? policyGrid[y][x] : 0
							});
						}
					}
				}

				analyzeMoves = moves
					.sort((a, b) => b.policy - a.policy)
					.map(item => item.move);
			} else {
				analyzeMoves = [];
				for (let x = 0; x < boardSizeX; x++) {
					for (let y = 0; y < boardSizeY; y++) {
						if (!stones.has(`${x},${y}`)) {
							analyzeMoves.push(new Move([x, y], cn.nextPlayer));
						}
					}
				}
			}

			visits = engine.config.fastVisits;
			this.consoleLog(`基于 ${visits} 计算深度的全盘分析`);
			priority = PRIORITY_SWEEP;
		} else if (["equalize", "alternative", "local"].includes(mode)) {
			if (!cn.t.analysisComplete && mode !== "local") {
				this.consoleLog(`优化前等待初始分析完成`);
				return;
			}

			if (mode === "alternative") {
				this.consoleLog(`正在搜索其他走法`);
				cn.t.analyze(
					{
						engine: engine,
						priority: -1_000_000,
						findAlternatives: true,
					}
				);
				visits = engine.config.fastVisits;
			} else {
				visits = Math.max(...Object.values(cn.t.analysis["moves"]).map((d: any) => d["visits"]));
				this.consoleLog(`对待选点强制进行 ${visits} 步分析`);
			}

			priority = PRIORITY_EQUALIZE;
			analyzeMoves = Object.entries(cn.t.analysis["moves"]).map(
				([gtp, _]) => Move.fromGtp(gtp, cn.nextPlayer)
			);
		} else {
			throw new Error("Invalid analysis mode");
		}

		for (const move of analyzeMoves) {
			if ((cn.t.analysis["moves"][move.gtp()] || { "visits": 0 })["visits"] < visits) {
				cn.t.analyze(
					{
						engine: engine,
						priority: priority,
						visits: visits,
						refineMove: move,
					}
				);
			}
		}
	}

	selfPlay(untilMove: number | "end", targetBAdvantage: number | null = null): void {
		let cn = this.currentNode;

		let analysisKwargs: { [key: string]: number } = {};
		let engineSettings: { [key: string]: number } = {};

		if (targetBAdvantage !== null) {
			analysisKwargs = { "visits": Math.max(25, this.config.engine.fastVisits) };
			engineSettings = { "wideRootNoise": 0.03 };
		}

		const setAnalysis = (node: SGFNode<NodeInfo>, result: any): void => {
			node.t.setAnalysis(result);
			analyzeAndPlay(node);
		};

		const requestAnalysisForNode = (node: SGFNode<NodeInfo>): void => {
			this.engines[node.player].requestAnalysis(
				{
					node: node,
					callback: (result, _partial) => setAnalysis(node, result),
					analyzeFast: true,
					extraSettings: engineSettings,
					// analysisKwargs: analysisKwargs
				}
			);
		};

		const analyzeAndPlay = (node: SGFNode<NodeInfo>): void => {
			const candidates = node.t.candidateMoves;

			let aiThoughts = "Move generated by AI self-play\n";
			let move: Move;
			let moveInfo: { [key: string]: any } = {}

			if (untilMove !== "end" && targetBAdvantage !== null) { // setup pos
				if (node!.depth! >= (untilMove as number) || candidates[0]["move"] === "pass") {
					this.setCurrentNode(node);
					return;
				}

				const targetScore = cn.t.score! + (node.depth! - cn.depth! + 1) *
					(targetBAdvantage - cn.t.score!) / ((untilMove as number) - cn.depth!);
				const maxLoss = 5;
				const stddev = Math.min(3, 0.5 + ((untilMove as number) - node.depth!) * 0.15);
				aiThoughts += `Selecting moves aiming at score ${targetScore.toFixed(1)} +/- ${stddev.toFixed(2)} with < ${maxLoss} points lost\n`;

				if (Math.abs(node.t.score! - targetScore) < 3 * stddev) {
					const weightedCands: [number, any][] = [];
					for (let i = 0; i < candidates.length; i++) {
						const move = candidates[i];
						if (move["pointsLost"] < maxLoss || i === 0) {
							const weight = Math.exp(-0.5 * Math.pow(Math.abs(move["scoreLead"] - targetScore) / stddev, 2)) *
								Math.exp(-0.5 * Math.pow(Math.min(0, move["pointsLost"]) / maxLoss, 2));
							weightedCands.push([weight, move]);
						}
					}

					moveInfo = weightedSelectionWithoutReplacement(weightedCands, 1)[0][1];

					for (const [wt, move] of weightedCands) {
						this.consoleLog(
							`${moveInfo === move ? '* ' : '  '} ${move['move']} ${move['scoreLead']} ${wt}`,
							OUTPUT_EXTRA_DEBUG,
						);
						aiThoughts += `Move option: ${move['move']} score ${move['scoreLead'].toFixed(2)} loss ${move['pointsLost'].toFixed(2)} weight ${wt.toExponential(3)}\n`;
					}
				} else {
					moveInfo = candidates.reduce((prev, current) =>
						Math.abs(prev["scoreLead"] - targetScore) < Math.abs(current["scoreLead"] - targetScore) ? prev : current
					);

					this.consoleLog(
						`* Played ${moveInfo['move']} ${moveInfo['scoreLead']} because score deviation between current score ${node.t.score!} and target score ${targetScore} > ${3 * stddev}`,
						OUTPUT_EXTRA_DEBUG,
					);
					aiThoughts += `Move played to close difference between score ${node.t.score!.toFixed(1)} and target ${targetScore.toFixed(1)} quickly.`;
				}

				this.consoleLog(
					`Self-play until ${untilMove} target ${targetBAdvantage}: ${candidates.length} candidates -> move ${moveInfo['move']} score ${moveInfo['scoreLead']} point loss ${moveInfo['pointsLost']}`,
					OUTPUT_DEBUG,
				);
				move = Move.fromGtp(moveInfo["move"], node.nextPlayer);
			} else if (candidates.length > 0) {
				move = Move.fromGtp(candidates[0]["move"], node.nextPlayer);
			} else {
				const polmoves = node.t.policyRanking;
				move = polmoves.length > 0 ? polmoves[0][1] : new Move(undefined, "B");
			}

			if (move.isPass) {
				if (this.currentNode === cn) {
					this.setCurrentNode(node);
				}
				return;
			}

			const newNode = new SGFNode<NodeInfo>(new NodeInfo(), node, null, move);
			newNode.t.aiThoughts = aiThoughts;

			if (untilMove !== "end" && targetBAdvantage !== null) {
				this.setCurrentNode(newNode);
				this.consoleLog(`由AI自我对弈产生对局：${move}/${untilMove}手完成。`);
			} else {
				if (node !== cn) {
					node.t.removeShortcut();
				}
				cn.t.addShortcut(newNode);
			}

			this.updateMoveTree();
			requestAnalysisForNode(newNode);
		};

		requestAnalysisForNode(cn);
	}

	analyzeUndo(node: SGFNode<NodeInfo>): void {
		const trainConfig = this.config.trainer;
		const move = node.move;

		if (node !== this.currentNode ||
			node.t.autoUndo !== null ||
			!node.t.analysisComplete ||
			!move) {
			return;
		}

		const pointsLost = node.t.pointsLost!;
		const thresholds = trainConfig.evalThresholds;
		const numUndoPrompts = trainConfig.numUndoPrompts;

		let i = 0;
		while (i < thresholds.length && pointsLost < thresholds[i]) {
			i++;
		}

		const num_undos = i < numUndoPrompts.length ? numUndoPrompts[i] : 0;
		let undo = false;

		if (num_undos === 0) {
			undo = false;
		} else if (num_undos < 1) {
			undo = Math.random() < num_undos && node.parent!.children.length === 1;
		} else {
			undo = node.parent!.children.length <= num_undos;
		}

		node.t.autoUndo = undo;
		if (undo) {
			this.undo(1);
			this.consoleLog(`撤销第 ${move.gtp()} 手棋因为损失超过 ${pointsLost} 目. 悬停在该手棋 上方查看信息. 请再次尝试.`);
			this.updateState();
		}
	}

	updatePlayer(bw: string, kwargs: { playerType: string | undefined, playerSubtype: string | undefined, rank: number | undefined }): void {
		this.playersInfo[bw].update(kwargs.playerType, kwargs.playerSubtype);
		this.updateCalculatedRanks(kwargs.rank);
	}

	updateCalculatedRanks(rank: number | undefined): void {
		for (const bw in this.playersInfo) {
			const playerInfo = this.playersInfo[bw];
			if (playerInfo.playerType === PLAYER_AI) {
				let settings = this.config.ai[<keyof typeof this.config.ai>playerInfo.strategy];
				if(playerInfo.playerSubtype == PLAYER_HUMAN) {
					settings.humanKyuRank = rank ? rank : 8;
				}
				playerInfo.calculatedRank = aiRankEstimation(playerInfo.playerSubtype, settings);
			} else {
				playerInfo.calculatedRank = null;
			}
		}
	}

	resetPlayers(): void {
		this.updatePlayer("B", { playerType: undefined, playerSubtype: undefined, rank: undefined });
		this.updatePlayer("W", { playerType: undefined, playerSubtype: undefined, rank: undefined });
		for (const v of Object.values(this.playersInfo)) {
			(v as Player).periodsUsed = 0;
		}
	}

	get nextPlayerInfo() {
		return this.playersInfo[this.currentNode.nextPlayer];
	}
}

export {
	IllegalMoveException,
	BaseAnalysisEngine,
	AnalysisEngine
};