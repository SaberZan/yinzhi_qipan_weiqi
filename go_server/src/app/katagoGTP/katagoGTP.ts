import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { info } from 'console';
import * as path from 'path';

export default class KataGoGTP
{
    public readonly alphabet :string = "ABCDEFGHJKLMNOPQRSTUVWXYZ";

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

    public static maxVisits: {[key:string]:number} = {
        "20k": 1,
        "19k": 6, 
        "18k": 11, 
        "17k": 17, 
        "16k": 22, 
        "15k": 27, 
        "14k": 32, 
        "13k": 37, 
        "12k": 43, 
        "11k": 48, 
        "10k": 53, 
        "9k": 58, 
        "8K": 64, 
        "7k": 69, 
        "6k": 74, 
        "5k": 79, 
        "4k": 84, 
        "3k": 90, 
        "2k": 95, 
        "1k": 100,
        "1D": 150, 
        "2D": 170, 
        "3D": 200, 
        "4D": 230, 
        "5D": 250, 
        "6D": 300, 
        "7D": 350, 
        "8D": 380, 
        "9D": 400,
    };

    public static GetRank(rank: number): string {
        if(rank > 0)
        {
            return rank + "K";
        }
        else
        {
            return (1-rank) + "D";
        }
    }

    process: ChildProcessWithoutNullStreams;

    private katagoPath: string = path.join(process.cwd(), 'katago', 'katago');

    private configPath: string = path.join(process.cwd(), 'katago', 'configs', 'gtp_human_example.cfg');

    private modelPath: string = path.join(process.cwd(), 'katago', 'kata1-b18c384nbt-s9996604416-d4316597426.bin.gz');

    private modelHumanlikePath: string = path.join(process.cwd(), 'katago', 'b18c384nbt-humanv0.bin.gz');

    responseBuffer : string = "";
    
    commandQueue : { n : number, command : string, resolve : (value : string) => void, reject : (reason : Error) => void }[] = [];

    isReady : boolean = false;

    isProcessing : boolean = false;

    n : number = 0;
    constructor()
    {
        this.process = spawn(this.katagoPath, ['gtp', '-config', this.configPath, '-model', this.modelPath, '-human-model', this.modelHumanlikePath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.process.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('KataGo output:', output);
            this.handleOutput(output);
        });

        this.process.stderr.on('data', (data) => {
            console.error('KataGo stderr:', data.toString());
        });

        this.process.on('error', (error) => {
            console.error('Failed to start KataGo:', error);
        });

        this.process.on('close', (code) => {
            console.log(`KataGo process exited with code ${code}`);
        });

        setTimeout(() => {
            this.isReady = true;
        }, 2000);
    }

    handleOutput(output : string) {
        this.responseBuffer += output;
        this.responseBuffer = this.responseBuffer.replace(/\r\n/g, '\n');
        while (this.responseBuffer.includes('\n\n')) {
            const idx = this.responseBuffer.indexOf('\n\n');
            const response = this.responseBuffer.substring(0, idx);
            this.responseBuffer = this.responseBuffer.substring(idx + 2);
            this.isProcessing = false;

            const lines = response.trim().split('\n');
            const success = lines[0] && lines[0].startsWith('=');
            let order = "";
            let line = lines[0];
            let orderIndex = 1;
            let char = line[orderIndex]
            while(char != undefined && char != " ")
            {
                order += char;
                orderIndex++;
                char = line[orderIndex];
            }
            var cmd = this.commandQueue[0];
            if (cmd && cmd.n.toString() == order) {
                this.commandQueue.splice(0,1);
                const reject = cmd.reject;
                const resolve = cmd.resolve;

                const result = lines.map(l => l.startsWith('=') || l.startsWith('?') ? l.substring(1).trim() : l.trim()).filter(l => l).join('\n');
                
                if (success) {
                    resolve(result);
                } else {
                    reject(new Error(`GTP错误: ${result}`));
                }
                this.processNextCommand();
            }
        }
    }

    waitReady(): Promise<void> {
        return new Promise((resolve) => {
            const checkCompletion = () => {
                if (this.isReady) {
                    resolve();
                } else {
                    setTimeout(checkCompletion, 10);
                }
            };
            checkCompletion();
        });
    }

    processNextCommand() {
        if (this.commandQueue.length > 0 && !this.isProcessing) {
            this.isProcessing = true;
            const { n, command } = this.commandQueue[0];
            console.log(`[KatagoGTP] Sending command ${n} ${command}`);
            this.process.stdin.write(n + ' ' + command + '\n');
        }
    }

    async sendCommand(command : string) : Promise<string>{
        const n = this.n++;
        return new Promise((resolve, reject) => {
            if (!this.isReady) {
                reject(new Error('GTP client is not ready'));
                return;
            }

            this.commandQueue.push({ n, command, resolve, reject });
            this.processNextCommand();
        });
    }

    async initGame(size : number = 19, rule : string, komi : number = 6.5, handicap : number = 0) {
        await this.boardsize(size);
        await this.clear_board();
        // await this.fixed_handicap(handicap);
        await this.komi(komi);
        // await this.rules(KataGoGTP.getRules(rule));
    }

    async updateRank(rank : number = 0) {
        return this.sendCommand(`maxVisits ${KataGoGTP.maxVisits[KataGoGTP.GetRank(rank)]}`);
    }

    async boardsize(size) {
        return this.sendCommand(`boardsize ${size}`);
    }

    async komi(komi) {
        return this.sendCommand(`komi ${komi}`);
    }

    async clear_board() {
        return this.sendCommand('clear_board');
    }

    async rules(rule) {
        return this.sendCommand(`kata-set-rule ${rule}`);
    }

    async fixed_handicap(count) {
        const result = await this.sendCommand(`fixed_handicap ${count}`);
        return result.trim();
    }

    async place_free_handicap(count) {
        const result = await this.sendCommand(`place_free_handicap ${count}`);
        return result.trim();
    }

    async set_free_handicap(moves) {
        return await this.sendCommand(`set_free_handicap ${moves}`);
    }

    async play(color : string, gtp : string) {
        const command = `play ${color} ${gtp}`;
        return await this.sendCommand(command);
    }

    async genMove(color : string) {
        const command = `genmove ${color}`;
        return await this.sendCommand(command);
    }

    async getBoard() {
        const response = await this.sendCommand('showboard');
        return this.parseBoard(response);
    }

    async final_score() {
        return await this.sendCommand('final_score');
    }

    async final_status_list(status) {
        return await this.sendCommand(`final_status_list ${status}`);
    }
    async undo() {
        return await this.sendCommand('undo');
    }

    async resign() {
		await this.sendCommand("kata-resign");
	}
    async getScore(moveHistory, boardSize = 19) {
        try {
            await this.clear_board();
            if (boardSize !== 19) await this.boardsize(boardSize);
            
            for (const m of moveHistory) {
                await this.play(m.color, m.move);
            }

            const score = await this.final_score();
            const dead = await this.final_status_list('dead');
            const alive = await this.final_status_list('alive');
            const seki = await this.final_status_list('seki');

            const deadStones = dead ? dead.split(' ').filter(s => s.trim()) : [];
            const aliveStones = alive ? alive.split(' ').filter(s => s.trim()) : [];
            const sekiStones = seki ? seki.split(' ').filter(s => s.trim()) : [];

            let blackScore = 0, whiteScore = 0;
            if (score) {
                if (score.includes('B+')) {
                blackScore = parseFloat(score.replace('B+', ''));
                } else if (score.includes('W+')) {
                whiteScore = parseFloat(score.replace('W+', ''));
                }
            }

            return {
                result: score,
                blackScore,
                whiteScore,
                dead: deadStones,
                alive: aliveStones,
                seki: sekiStones
            };
        } catch (e) {
            console.error('KataGo', `形势判断失败: ${e.message}`);
        return null;
        }
    }

    async getAnalysis() {
        const promise1 = this.sendCommand('kata-analyze 100 rootInfo true ownership true');
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(0);
            }, 3000);
        });
        this.process.stdin.write("showboard" + '\n');
        const response = await promise1;
        if (!response) {
            throw new Error('Failed to get analysis or board');
        }
        return this.parseAnalysis(response);
    }

    parseAnalysis(analysisText : string) {
        const analysis = { info : [], rootInfo : { }, ownership : []};
        const lines = analysisText.split('\n');
        let analysisData = {};
        let two = ["move", "visits", "edgeVisits", "utility", "winrate", "scoreMean", "scoreStdev", "scoreLead", "scoreSelfplay", 
                    "prior", "lcb", "utilityLcb", "weight", "order", "isSymmetryOf", "rawStWrError", "rawStScoreError", "rawVarTimeLeft"];
        let mult = ["pv"]
        let start = ["info", "rootInfo", "ownership"]
        for (const line of lines) {
            const parts = line.split(' ');
            for(let i = 0; i < parts.length; ++i)
            {
                let part = parts[i];
                if(part == "info")
                {
                    analysisData = {}; 
                    analysis.info.push(analysisData);
                    continue;
                }
                if(part == "rootInfo")
                {
                    analysisData = { };
                    analysis.rootInfo = analysisData;
                }
                if(part == "ownership")
                {
                    let arr = [];
                    analysis.ownership = arr;
                    ++i;
                    part = parts[i];
                    while(i < parts.length)
                    {
                        arr.push(parseFloat(part));
                        ++i;
                        part = parts[i];
                    }
                    break;
                }
                if(two.includes(part))
                {
                    analysisData[part] = parseFloat(parts[i+1]);
                    ++i
                    continue;
                }
                if(mult.includes(part))
                {
                    let arr = [];
                    analysisData[part] = arr;
                    ++i;
                    part = parts[i];
                    while(!two.includes(part) && !mult.includes(part) && !start.includes(part))
                    {
                        arr.push(parseFloat(part));
                        ++i;
                        part = parts[i];
                    }
                    --i;
                }

            }
        }
        return analysis;
    }

    parseBoard(boardText : string) {
        const lines = boardText.split('\n');
        const board : {
            size: number,
            stones: { [key: string]: string },
            lastMove: { col: number, row: number } | null
        } = {
            size: 19,
            stones: {},
            lastMove: null
        };

        const boardLineRegex = /^\s*(\d+)\s+/;

        for (const line of lines) {
            const match = line.match(boardLineRegex);
            if (match) {
                const row = parseInt(match[1], 10);
                if (row >= 1 && row <= board.size) {
                    for (let col = 0; col < board.size; col++) {
                        const charIndex = col * 2 + 3;
                        if (charIndex < line.length) {
                            const char = line.charAt(charIndex);
                            const columnChar = this.alphabet[col];
                            const coord = `${columnChar}${row}`;

                            if (char === 'X') {
                                board.stones[coord] = 'black';
                            } else if (char === 'O') {
                                board.stones[coord] = 'white';
                            }
                        }
                    }
                }
            }
        }
        return board;
    }

    async quit() {
        if (this.process) {
            await this.sendCommand('quit');
            this.process.kill();
        }
    }
}