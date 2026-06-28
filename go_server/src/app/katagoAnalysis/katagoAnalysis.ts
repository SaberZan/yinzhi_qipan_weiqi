import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as path from 'path';
import { Move, SGFNode } from './sgfParser';
import { NodeInfo } from './nodeInfo';
import { OUTPUT_ERROR, OUTPUT_INFO, PONDERING_REPORT_DT, REPORT_DT } from './constants';
import { AnalysisEngine } from './analysisEngine';


export class KataGoEngineInterface {

    public readonly alphabet: string = "ABCDEFGHJKLMNOPQRSTUVWXYZ";


    //rules
    public static RULESETS_ABBR: { [key: string]: string } = {
        "jp": "japanese",
        "cn": "chinese",
        "ko": "korean",
        "aga": "aga",
        "tt": "tromp-taylor",
        "nz": "new zealand",
        "stone_scoring": "stone_scoring",
    };

    public static getRules(ruleset: any): any {
        if (typeof ruleset === 'string' && ruleset.trim().startsWith("{")) {
            try {
                ruleset = JSON.parse(ruleset);
            } catch (e) {
                // Ignore parse error
            }
        }
        if (typeof ruleset === 'object') {
            return ruleset;
        }
        return this.RULESETS_ABBR[String(ruleset).toLowerCase()] || "japanese";
    }


    public config: any;

    public engineKey : string = "";

    public setConfig(config :any) {
        this.config = config;
    }

    public setEngine(engine: AnalysisEngine) {
        
    }

    public setEngineKey(key: string) {
        this.engineKey = key;
    }


    public terminateQueries(node: SGFNode<NodeInfo> | null): void {

    }
    public stopPondering(): void {

    }

    public requestAnalysis({
            node = new SGFNode<NodeInfo>(),
            callback = (result: any, partial: boolean) => { },
            errorCallback = (result: any, partial: boolean) => { },
            priority = 0,
            analyzeFast = false,
            visits = undefined,
            findAlternatives = false,
            ponder = false,
            ownerShip = false,
            timeLimit = false,
            nextMove = undefined,
            regionOfInterest = undefined,
            includePolicy = false,
            extraSettings = undefined,
            reportEvery = REPORT_DT
        }: {
            node?: SGFNode<NodeInfo>,
            callback?: (result: any, partial: boolean) => void,
            errorCallback?: ((result: any, partial: boolean) => void),
            visits?: number,
            analyzeFast?: boolean,
            timeLimit?: boolean,
            findAlternatives?: boolean,
            regionOfInterest?: [number, number, number, number],
            priority?: number,
            ponder?: boolean, // infinite visits, cancellable
            ownerShip?: boolean,
            nextMove?: Move,
            extraSettings?: any,
            includePolicy?: boolean,
            reportEvery?: number,
        }
    ): void {

    }

}

export class katagoAnalysis extends KataGoEngineInterface {
    

    private process!: ChildProcessWithoutNullStreams;

    private katagoPath: string = path.join(process.cwd(), 'katago', 'katago');

    private configPath: string = path.join(process.cwd(), 'katago', 'configs', 'analysis_example.cfg');

    private modelPath: string = path.join(process.cwd(), 'katago', 'kata1-b18c384nbt-s9996604416-d4316597426.bin.gz');

    private modelHumanlikePath: string = path.join(process.cwd(), 'katago', 'b18c384nbt-humanv0.bin.gz');

    private responseBuffer: string = "";

    private commandQueue: { n: number, command: any, nextMove?: Move, node?: SGFNode<NodeInfo>, success: (value: string) => void, fail: (reason: Error) => void }[] = [];

    private isReady: boolean = false;

    private isProcessing: boolean = false;

    private n: number = 0;

    private overrideSettings = {"reportAnalysisWinratesAs": "BLACK"};  // force these settings
    
    private basePriority : number = 0;

    private PONDER_KEY = "_kt_continuous";

    private ponderCommand = {};

    private engine!: AnalysisEngine;


    public setEngine(engine: AnalysisEngine) {
        this.engine = engine;

        this.process = spawn(this.katagoPath, ['analysis', '-config', this.configPath, '-model', this.modelPath, '-human-model', this.modelHumanlikePath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.process.stdout.on('data', (data) => {
            const output = data.toString();
            this.engine.consoleLog(`${this.engineKey}   KataGo output:${output}`, OUTPUT_INFO);
            this.handleOutput(output);
        });

        this.process.stderr.on('data', (data) => {
            this.engine.consoleLog(`${this.engineKey}  KataGo stderr: ${data.toString()}`, OUTPUT_ERROR);
        });

        this.process.on('error', (error) => {
            this.engine.consoleLog(`${this.engineKey}  Failed to start KataGo:${error}`, OUTPUT_ERROR);
        });

        this.process.on('close', (code) => {
            this.engine.consoleLog(`${this.engineKey}  KataGo process exited with code ${code}`);
        });

        setTimeout(() => {
            this.isReady = true;
        }, 2000);
    }


    handleOutput(output: string) {
        this.responseBuffer += output;
        const terminator = '\r\n';
        let terminatorIndex;

        // Process all complete commands in the buffer
        while ((terminatorIndex = this.responseBuffer.indexOf(terminator)) !== -1) {
            const responseBlock = this.responseBuffer.substring(0, terminatorIndex).trim();
            this.responseBuffer = this.responseBuffer.substring(terminatorIndex + terminator.length);

            if (!this.isProcessing) {
                // Received a response when not expecting one, might be initial GTP hello message.
                this.engine.consoleLog(`Ignoring unsolicited response: ${responseBlock}`);
                continue;
            }

            if (responseBlock.includes('Uncaught exception')) {
                let msg = `KataGo Engine Failed: ${responseBlock}`
                this.engine.consoleLog(msg, OUTPUT_ERROR);
                return;
            }

            
            let analysis = JSON.parse(responseBlock);
            if(!analysis.id) {
                this.engine.consoleLog(`Error without ID ${analysis} received from KataGo`)
                continue
            }
            let query_id = analysis.id;

            var cmd = this.commandQueue[0];
            if (query_id == cmd?.command.id) {
                this.commandQueue.splice(0, 1);
                if (responseBlock.includes('error')) {
                    cmd?.fail(new Error(`Invalid GTP response: ${responseBlock}`));
                    return;
                }
                cmd?.success(analysis);
            } else{
                this.engine.consoleLog(`Warning: Response does not match expected command number ${cmd?.n}: ${responseBlock}`);
                return;
            }

            this.isProcessing = false;
            this.processNextCommand();
        }
    }

    processNextCommand() {
        if (this.commandQueue.length > 0 && !this.isProcessing) {
            this.isProcessing = true;
            const { n, command } = this.commandQueue[0];

            if(!command.id) {
                command.id = n.toString();
            }

            if(command[this.PONDER_KEY]) {
                let pq : { [key:string]:any } = this.ponderCommand || {}
                const differences = Object.keys({...pq, ...command})
                    .filter(k => !["id", "maxVisits", "reportDuringSearchEvery"].includes(k))
                    .filter(k => pq[k] !== command[k])
                    .reduce((obj, k) => {
                        obj[k] = [pq[k], command[k]];
                        return obj;
                    }, {} as Record<string, [any, any]>);
                if(Object.keys(differences).length > 0) {
                    this.stopPondering()
                    command["maxVisits"] = 10_000_000
                    command["reportDuringSearchEvery"] = PONDERING_REPORT_DT
                    this.ponderCommand = command
                }
                else{
                    return;
                }
            }
            command[this.PONDER_KEY] = undefined;

            let queryStr = JSON.stringify(command) + '\n';
            console.log("queryStr = " + queryStr);

            this.process.stdin.write(queryStr);
        }
    }

    async sendCommand( 
        { 
            command = {}, 
            success = undefined, 
            fail = undefined,
            node = undefined,
        }: {
             command: any, 
             nextMove?: Move, 
             node?: SGFNode<NodeInfo>, 
             success?: (value: string) => void, 
             fail?: (reason: Error) => void 
        }
    ): Promise<string> {
        console.log(`${this.engineKey}  1 n:  ${this.n}`);
        let n = this.n++;
        return new Promise((resolve, reject) => {
            if (!this.isReady) {
                reject(new Error('GTP client is not ready'));
                return;
            }
            command.id = `QUERY:${n}`
            this.commandQueue.push(
                { 
                    n : n, 
                    command : command, 
                    success: (result)=>{ resolve(result); if(success)success(result); },
                    fail: (reason)=>{ reject(reason); if(fail)fail(reason); }, 
                    node: node,
                }
            );
            this.processNextCommand();
        });
    }

    terminateCommand(id:number) {
        this.sendCommand({ command :{"action": "terminate", "terminateId": id} })
    }

    async quit() {
        if (this.process) {
            await this.sendCommand({ command :'quit' });
            this.process.kill();
        }
    }

    requestAnalysis({
            node = new SGFNode<NodeInfo>(),
            callback = (result: any, partial: boolean) => { },
            errorCallback = (result: any, partial: boolean) => { },
            priority = 0,
            analyzeFast = false,
            visits = undefined,
            findAlternatives = false,
            ponder = false,
            ownerShip = false,
            timeLimit = false,
            nextMove = undefined,
            regionOfInterest = undefined,
            includePolicy = false,
            extraSettings = undefined,
            reportEvery = REPORT_DT
        }: {
            node?: SGFNode<NodeInfo>,
            callback?: (result: any, partial: boolean) => void,
            errorCallback?: ((result: any, partial: boolean) => void),
            visits?: number,
            analyzeFast?: boolean,
            timeLimit?: boolean,
            findAlternatives?: boolean,
            regionOfInterest?: [number, number, number, number],
            priority?: number,
            ponder?: boolean, // infinite visits, cancellable
            ownerShip?: boolean,
            nextMove?: Move,
            extraSettings?: any,
            includePolicy?: boolean,
            reportEvery?: number,
        }
    ): void {

        let nodes = node.nodesFromRoot;
        let moves = nodes.flatMap(node => node.moves);
        let initialStones = nodes.flatMap(node => node.placements);
        let clearPlacements = nodes.flatMap(node => node.clearPlacements);

        if (clearPlacements.length > 0) {
            console.debug(`\nNot analyzing node ${node} as there are AE commands in the path`)
            return;
        }
        if(nextMove)
        {
            moves.push(nextMove);
        }
        ownerShip = ownerShip || (this.config.enableOwnership && !nextMove)
        visits = visits || (analyzeFast && this.config.fastVisits ? this.config.fastVisits : this.config.maxVisits)

        const [size_x, size_y] = node.boardSize;

        let avoid: any[] = [];
        if (findAlternatives) {
            avoid = [
                {
                    "moves": Object.keys(node.t.analysis["moves"]),
                    "player": node.nextPlayer,
                    "untilDepth": 1,
                }
            ];
        } else if (regionOfInterest) {
            const [xmin, xmax, ymin, ymax] = regionOfInterest;
            avoid = ["B", "W"].map(player => ({
                "moves": Array.from({ length: size_x }, (_, x) => 
                        Array.from({ length: size_y }, (_, y) => ({ x, y }))
                        )
                        .flat()
                        .filter(({ x, y }) => x < xmin || x > xmax || y < ymin || y > ymax)
                        .map(({ x, y }) => new Move([x, y]).gtp()),
                "player": player,
                "untilDepth": 1,
            }));
        }

        const settings : { [key:string]: any} = { ...this.overrideSettings };
        settings.wideRootNoise = this.config.wideRootNoise;
        if (timeLimit) {
            settings["maxTime"] = this.config.maxTime;
        }

        const query: any = {
            "rules": KataGoEngineInterface.getRules(node.ruleset),
            "priority": this.basePriority + priority,
            "analyzeTurns": [moves.length],
            "maxVisits": visits,
            "komi": node.komi,
            "boardXSize": size_x,
            "boardYSize": size_y,
            "includeOwnership": ownerShip && !nextMove,
            "includeMovesOwnership": ownerShip && !nextMove,
            "includePolicy": includePolicy,
            "initialStones": initialStones.map(m => [m.player, m.gtp()]),
            "initialPlayer": node.initialPlayer,
            "moves": moves.map(m => [m!.player, m!.gtp()]),
            "overrideSettings": { ...settings, ...(extraSettings || {}) },
        };
        query[this.PONDER_KEY] = ponder;

        if (reportEvery !== undefined && reportEvery !== null) {
            query["reportDuringSearchEvery"] = reportEvery;
        }
        if (avoid.length > 0) {
            query["avoidMoves"] = avoid;
        }

        this.sendCommand(
            {
                command : query,  
                success : (value)=> callback(value, false),
                fail : (err)=> errorCallback(err, false),
                nextMove: nextMove, 
                node: node
            }
        );
        node.t.analysisVisitsRequested = Math.max(node.t.analysisVisitsRequested, visits);

    }
}