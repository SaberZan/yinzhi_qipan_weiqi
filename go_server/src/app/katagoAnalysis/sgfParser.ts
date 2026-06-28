// sgf_parser.ts
import * as fs from 'fs';

export class ParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ParseError";
    }
}

export class Move {
    static GTP_COORD: string[] = [
        ..."ABCDEFGHJKLMNOPQRSTUVWXYZ".split(''),
        ..."ABCDEFGH".split('').flatMap(xa => 
            "ABCDEFGHJKLMNOPQRSTUVWXYZ".split('').map(c => xa + c)
        )
    ]; // board size 52+ support
    
    static PLAYERS = "BW";
    static SGF_COORD: string[] = [
        ..."abcdefghijklmnopqrstuvwxyz".split(''),
        ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('')
    ]; // sgf goes to 52

    player: string;
    coords: [number,number] = [0,0];

    static fromGtp(gtpCoords: string, player: string = "B"): Move {
        if (gtpCoords.toLowerCase().includes("pass")) {
            return new Move(undefined, player);
        }
        const match = gtpCoords.match(/^([A-Z]+)(\d+)$/);
        if (match) {
            return new Move([
                Move.GTP_COORD.indexOf(match[1]), 
                parseInt(match[2]) - 1
            ], player);
        }
        return new Move(undefined, player);
    }

    static fromSgf(sgfCoords: string, boardSize: [number, number], player: string = "B"): Move {
        if (sgfCoords === "" || (
            sgfCoords === "tt" && boardSize[0] <= 19 && boardSize[1] <= 19
        )) { // [tt] can be used as "pass" for <= 19x19 board
            return new Move(undefined, player);
        }
        return new Move([
            Move.SGF_COORD.indexOf(sgfCoords[0]), 
            boardSize[1] - Move.SGF_COORD.indexOf(sgfCoords[1]) - 1
        ], player);
    }

    static opponentPlayer(player: string): string {
        return player === "B" ? "W" : "B";
    }

    constructor(coords: [number,number] | null = null, player: string = "B") {
        this.player = player;
        if(coords)
            this.coords = coords;
    }

    toDataString(): string {
        var data = {
            "player": this.player,
            "coords": this.gtp()
        }
        return JSON.stringify(data);
    }

    equals(other: Move): boolean {
        return JSON.stringify(this.coords) === JSON.stringify(other.coords) && 
               this.player === other.player;
    }

    gtp(): string {
        if (this.isPass) {
            return "pass";
        }
        if (this.coords) {
            return Move.GTP_COORD[this.coords[0]] + (this.coords[1] + 1).toString();
        }
        return "pass";
    }

    sgf(boardSize: [number, number]): string {
        if (this.isPass) {
            return "";
        }
        if (this.coords) {
            return `${Move.SGF_COORD[this.coords[0]]}${Move.SGF_COORD[boardSize[1] - this.coords[1] - 1]}`;
        }
        return "";
    }

    get isPass(): boolean {
        return this.coords === null;
    }

    get opponent(): string {
        return Move.opponentPlayer(this.player);
    }
}

export class NodeExpand {
    public SetNode(node : SGFNode<NodeExpand>) {

    }

    public CreateNodeExpand() : NodeExpand {
        return new NodeExpand();
    }
}

export class SGFNode < T extends NodeExpand> {
    children: SGFNode <T>[] = [];
    properties: Map<string, any[]> = new Map();
    parent: SGFNode<T> | null = null;
    movesCache: Move[] | null = null;
    private _root: SGFNode<T> | null = null;
    private _depth: number = 0;

    public t!: T;

    constructor(t : T | null = null , parent: SGFNode<T> | null = null,  properties: Record<string, any> | null = null, move: Move | null = null) {
        if(t) {
            this.t = t;
            this.t.SetNode(this);
        }

        this.parent = parent;
        if (this.parent) {
            this.parent.children.push(this);
        }
        
        if (properties) {
            for (const [k, v] of Object.entries(properties)) {
                console.log("properties ==" , k, v);

                this.setProperty(k, v);
            }
        }
        
        if (parent && move) {
            this.setProperty(move.player, move.sgf(this.boardSize));
        }
        this._clearCache();
    }

    _clearCache(): void {
        this.movesCache = null;
    }

    toDataString(): string {
        return `SGFNode(${JSON.stringify(Object.fromEntries(this.properties))})`;
    }

    sgfProperties(...args:any[]): Record<string, any[]> {
        const result: Record<string, any[]> = {};
        for (const [key, value] of this.properties.entries()) {
            result[key] = [...value];
        }
        return result;
    }

    get orderedChildren(): SGFNode<T>[] {
        return this.children;
    }

    static _escapeValue(value: any): string {
        if (typeof value === 'string') {
            return value.replace(/([\\$\]])/g, '\\$1');
        }
        return value;
    }

    static _unescapeValue(value: any): string {
        if (typeof value === 'string') {
            return value.replace(/\\([\\$\]])/g, '$1');
        }
        return value;
    }

    sgf(...args: any[]): string {
        const nodeSgfStr = (node: SGFNode<T>): string => {
            let result = ";";
            for (const [prop, values] of Object.entries(node.sgfProperties(args))) {
                if (values && values.length > 0) {
                    result += prop + values.map(v => `[${SGFNode._escapeValue(v)}]`).join('');
                }
            }
            return result;
        };

        const stack: (SGFNode<T> | string)[] = [")", this, "("];
        let sgfStr = "";
        
        while (stack.length > 0) {
            const item = stack.pop()!;
            if (typeof item === 'string') {
                sgfStr += item;
            } else {
                sgfStr += nodeSgfStr(item);
                if (item.children.length === 1) {
                    stack.push(item.children[0]);
                } else if (item.children.length > 0) {
                    const reversedChildren = [...item.orderedChildren].reverse();
                    for (const c of reversedChildren) {
                        stack.push(")");
                        stack.push(c);
                        stack.push("(");
                    }
                }
            }
        }
        return sgfStr;
    }

    addListProperty(property: string, values: any[]): void {
        const normalizedProperty = property.replace(/[a-z]/g, "");
        this._clearCache();
        const currentValues = this.properties.get(normalizedProperty) || [];
        this.properties.set(normalizedProperty, [...currentValues, ...values]);
    }

    getListProperty(property: string, defaultValue: any = null): any {
        return this.properties.get(property) || defaultValue;
    }

    setProperty(property: string, value: any): void {
        if (!Array.isArray(value)) {
            value = [value];
        }
        this._clearCache();
        this.properties.set(property, value);
    }

    getProperty(property: string, defaultValue: any = null): any {
        const values = this.properties.get(property);
        if (values && values.length > 0) {
            return values[0];
        }
        return defaultValue;
    }

    clearProperty(property: string): any {
        return this.properties.delete(property);
    }

    get root(): SGFNode<T> | null {
        if (this._root === null) {
            this._root = this.parent ? this.parent.root : this;
        }
        return this._root;
    }

    get depth(): number | null {
        if (this._depth === null) {
            const moves = this.moves;
            if (this.isRoot) {
                this._depth = 0;
            } else {
                this._depth = (this.parent?.depth || 0) + (moves?.length??0);
            }
        }
        return this._depth;
    }

    get boardSize(): [number, number] {
        const size = this.root?.getProperty("SZ", "19");
        if (typeof(size) == "string" && size.includes(":")) {
            const [x, y] = size.split(":").map(Number);
            return [x, y];
        } else if(typeof(size) == "string") {
            const x = parseInt(size);
            return [x, x];
        } else {
            return [size, size];
        }
    }

    get komi(): number {
        try {
            return parseFloat(this.root?.getProperty("KM", 6.5));
        } catch (e) {
            return 6.5;
        }
    }

    get handicap(): number {
        try {
            return parseInt(this.root?.getProperty("HA", 0));
        } catch (e) {
            return 0;
        }
    }

    get ruleset(): string {
        return this.root?.getProperty("RU", "japanese");
    }

    get moves(): Move[] | null {
        if (this.movesCache === undefined || this.movesCache === null) {
            this.movesCache = [];
            for (const pl of Move.PLAYERS) {
                const moves = this.getListProperty(pl, []);
                for (const move of moves) {
                    this.movesCache.push(Move.fromSgf(move, this.boardSize, pl));
                }
            }
        }
        return this.movesCache;
    }

    private _expandedPlacements(player: string | null): Move[] {
        const sgfPl = player || "E"; // AE
        const placements = this.getListProperty("A" + sgfPl, []);
        if (!placements || placements.length === 0) {
            return [];
        }
        
        const toBeExpanded = placements.filter((p: string) => p.includes(":"));
        const boardSize = this.boardSize;
        
        if (toBeExpanded.length > 0) {
            const coords = new Set<string>();
            const moveCoords: Move[] = [];
            
            for (const p of placements) {
                if (!p.includes(":")) {
                    const move = Move.fromSgf("", boardSize, sgfPl);
                    const key = `${move.coords?.[0]},${move.coords?.[1]},${move.player}`;
                    if (!coords.has(key)) {
                        coords.add(key);
                        moveCoords.push(move);
                    }
                }
            }
            
            for (const p of toBeExpanded) {
                const parts = p.split(":");
                if (parts.length >= 2) {
                    const fromCoord = Move.fromSgf(parts[0], boardSize);
                    const toCoord = Move.fromSgf(parts[1], boardSize);
                    
                    if (fromCoord.coords && toCoord.coords) {
                        for (let x = fromCoord.coords[0]; x <= toCoord.coords[0]; x++) {
                            for (let y = toCoord.coords[1]; y <= fromCoord.coords[1]; y++) {
                                if (0 <= x && x < boardSize[0] && 0 <= y && y < boardSize[1]) {
                                    const key = `${x},${y},${player}`;
                                    if (!coords.has(key)) {
                                        coords.add(key);
                                        moveCoords.push(new Move([x, y], player || ""));
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return moveCoords;
        } else {
            return placements.map((sgfCoord: string) => 
                Move.fromSgf(sgfCoord, boardSize, sgfPl)
            );
        }
    }

    get placements(): Move[] {
        const result: Move[] = [];
        for (const pl of Move.PLAYERS) {
            result.push(...this._expandedPlacements(pl));
        }
        return result;
    }

    get clearPlacements(): Move[] {
        return this._expandedPlacements(null);
    }

    get moveWithPlacements(): Move[] {
        return [...this.placements, ...this.moves??[]];
    }

    get move(): Move | null {
        const moves = this.moves;
        if (moves?.length === 1) {
            return moves[0];
        }
        return null;
    }

    get isRoot(): boolean {
        return this.parent === null;
    }

    get isPass(): boolean {
        return !this.placements.length && this.move !== null && this.move.isPass;
    }

    get empty(): boolean {
        return this.children.length === 0 && this.properties.size === 0;
    }

    get nodesInTree(): SGFNode<T>[] {
        const stack : SGFNode<T>[] = [this];
        const nodes: SGFNode<T>[] = [];
        while (stack.length > 0) {
            const item = stack.shift()!;
            nodes.push(item);
            stack.push(...item.children);
        }
        return nodes;
    }

    get nodesFromRoot(): SGFNode<T>[] {
        const nodes : SGFNode<T>[]  = [this];
        let n: SGFNode<T> | null = this;
        while (!n?.isRoot) {
            if(n) {
                n = n.parent;
                if (n) {
                    nodes.push(n);     
                }
            }  
        }
        return nodes.reverse();
    }

    play(move: Move): SGFNode<T> {
        for (const c of this.children) {
            if (c.move && c.move.equals(move)) {
                return c;
            }
        }
        return new SGFNode<T>(<T>this.t?.CreateNodeExpand()??null, this, this.properties, move);
    }

    get initialPlayer(): string {
        const root = this.root;
        if (root?.properties.has("PL")) {
            return root?.getProperty("PL").toUpperCase().trim() === "B" ? "B" : "W";
        } else if (root?.children.length??0 > 0) {
            for (const child of root?.children??[]) {
                for (const color of ["B", "W"]) {
                    if (child.properties.has(color)) {
                        return color;
                    }
                }
            }
        }
        if (root?.properties.has("AB") && !root?.properties.has("AW")) {
            return "W";
        } else {
            return "B";
        }
    }

    get nextPlayer(): string {
        if (this.isRoot) {
            return this.initialPlayer;
        } else if (this.properties.has("B")) {
            return "W";
        } else if (this.properties.has("W")) {
            return "B";
        } else {
            return this.parent?.nextPlayer || "B";
        }
    }

    get player(): "B" | "W" {
        if (this.properties.has("B") || (this.properties.has("AB") && !this.properties.has("W"))) {
            return "B";
        } else {
            return "W";
        }
    }

    placeHandicapStones(nHandicaps: number, tygem: boolean = false): void {
        const [boardSizeX, boardSizeY] = this.boardSize;
        if (Math.min(boardSizeX, boardSizeY) < 3) {
            return;
        }
        
        const nearX = boardSizeX >= 13 ? 3 : Math.min(2, boardSizeX - 1);
        const nearY = boardSizeY >= 13 ? 3 : Math.min(2, boardSizeY - 1);
        const farX = boardSizeX - 1 - nearX;
        const farY = boardSizeY - 1 - nearY;
        const middleX = Math.floor(boardSizeX / 2);
        const middleY = Math.floor(boardSizeY / 2);
        
        let stones: [number,number][];
        if (nHandicaps > 9 && boardSizeX === boardSizeY) {
            const stonesPerRow = Math.ceil(Math.sqrt(nHandicaps));
            let spacing = (farX - nearX) / (stonesPerRow - 1);
            if (spacing < nearX) {
                // Adjust spacing if needed
            }
            const coords = Array.from(
                new Set(
                    Array.from({length: stonesPerRow}, (_, i) => 
                        Math.floor(0.5 + nearX + i * spacing)
                    )
                )
            );
            stones = coords.flatMap(x => 
                coords.map(y => <[number,number]>[x, y])
            );
            stones.sort((a, b) => {
                const distA = Math.pow(a[0] - (boardSizeX - 1) / 2, 2) + Math.pow(a[1] - (boardSizeY - 1) / 2, 2);
                const distB = Math.pow(b[0] - (boardSizeX - 1) / 2, 2) + Math.pow(b[1] - (boardSizeY - 1) / 2, 2);
                return distB - distA; // Sort by descending distance (furthest first)
            });
        } else {
            stones = [
                [farX, farY], [nearX, nearY], [farX, nearY], [nearX, farY]
            ];
            if (nHandicaps % 2 === 1) {
                stones.push([middleX, middleY]);
            }
            stones.push(
                [nearX, middleY], [farX, middleY], [middleX, nearY], [middleX, farY]
            );
        }
        
        if (tygem) {
            [stones[2], stones[3]] = [stones[3], stones[2]];
        }
        
        this.setProperty(
            "AB", 
            Array.from(
                new Set(
                    stones.slice(0, nHandicaps).map(stone => 
                        new Move(stone).sgf([boardSizeX, boardSizeY])
                    )
                )
            )
        );
    }
}

export class SGF {
    static DEFAULT_ENCODING = "UTF-8";
    static _NODE_CLASS = SGFNode<NodeExpand>;
    
    // Regex patterns
    static SGFPROP_PAT = /(?:\(|\)|;|(\w+)((?:\s*\[(?:[^\]\\]|\\.)*\])+))/gs;
    static SGF_PAT = /$$;.*$$/gs;

    static parseSgf(inputStr: string): SGFNode<NodeExpand> {
        const match = inputStr.match(SGF.SGF_PAT);
        const clippedStr = match ? match[0] : inputStr;
        const root = new SGF(clippedStr).root;
        
        // Fix weird FoxGo server KM values
        if (root.getListProperty("AP", []).includes("foxwq")) {
            let correctedKomi: number;
            if (parseInt(root.getProperty("HA", 0)) >= 1) {
                correctedKomi = 0.5;
            } else if (root.getProperty("RU").toLowerCase() in ["chinese", "cn"]) {
                correctedKomi = 7.5;
            } else {
                correctedKomi = 6.5;
            }
            root.setProperty("KM", correctedKomi);
        }
        return root;
    }

    static parseFile(filename: string, encoding?: string): SGFNode<NodeExpand> {
        const isGib = filename.toLowerCase().endsWith(".gib");
        const isNgf = filename.toLowerCase().endsWith(".ngf");

        const binContents = fs.readFileSync(filename);
        if (!encoding) {
            if (isGib || isNgf || binContents.includes(Buffer.from("AP[foxwq]"))) {
                encoding = "utf8";
            } else {
                const match = binContents.toString('ascii', 0, 300).match(/CA$$(.*?)$$/);
                if (match) {
                    encoding = match[1];
                } else {
                    // In a real implementation, you would use a library like chardet here
                    encoding = SGF.DEFAULT_ENCODING;
                }
                // workaround for some compatibility issues
                if (encoding === "Windows-1252" || encoding === "GB2312") {
                    encoding = "GBK";
                }
            }
        }
        
        let decoded: string;
        try {
            decoded = binContents.toString(encoding);
        } catch (e) {
            decoded = binContents.toString(SGF.DEFAULT_ENCODING);
        }
        
        if (isNgf) {
            return SGF.parseNgf(decoded);
        }
        if (isGib) {
            return SGF.parseGib(decoded);
        }
        return SGF.parseSgf(decoded);
    }

    contents: string;
    ix: number;
    root: SGFNode<NodeExpand>;

    constructor(contents: string) {
        this.contents = contents;
        const openParenIndex = this.contents.indexOf("(");
        if (openParenIndex === -1) {
            throw new ParseError(`Parse error: Expected '(' at start, found ${this.contents.substring(0, 50)}`);
        }
        this.ix = openParenIndex + 1;
        this.root = new SGFNode<NodeExpand>(new NodeExpand());
        this._parseBranch(this.root);
    }

    private _parseBranch(currentMove: SGFNode<NodeExpand>): void {
        while (this.ix < this.contents.length) {
            const remaining = this.contents.substring(this.ix);
            const match = remaining.match(SGF.SGFPROP_PAT);
            if (!match || match.index !== 0) {
                break;
            }
            
            const fullMatch = match[0];
            this.ix += fullMatch.length;
            const matchedItem = fullMatch.trim();
            
            if (matchedItem === ")") {
                return;
            }
            if (matchedItem === "(") {
                this._parseBranch(new SGFNode<NodeExpand>(new NodeExpand(), null, currentMove));
            } else if (matchedItem === ";") {
                const useless = this.ix < this.contents.length && this.contents.substring(this.ix).trim() === ")";
                if (!(currentMove.empty || useless)) {
                    currentMove = new SGFNode(new NodeExpand(), null, currentMove);
                }
            } else {
                const property = match[1];
                const valuePart = match[2].trim();
                const value = valuePart.substring(1, valuePart.length - 1);
                const values = value.split(/\]\s*$/).map(v => SGFNode._unescapeValue(v));
                currentMove.addListProperty(property, values);
            }
        }
        
        if (this.ix < this.contents.length) {
            throw new ParseError(`Parse Error: unexpected character at ${this.contents.substring(this.ix, this.ix + 25)}`);
        }
        throw new ParseError("Parse Error: expected ')' at end of input.");
    }

    // NGF parser adapted from https://github.com/fohristiwhirl/gofish/
    static parseNgf(ngf: string): SGFNode<NodeExpand> {
        ngf = ngf.trim();
        const lines = ngf.split("\n");

        let boardsize = 19;
        let handicap = 0;
        let pw = "";
        let pb = "";
        let rawdate = "";
        let komi = 0;

        try {
            boardsize = parseInt(lines[1]);
            handicap = parseInt(lines[5]);
            pw = lines[2].split(/\s+/)[0];
            pb = lines[3].split(/\s+/)[0];
            rawdate = lines[8].substring(0, 8);
            komi = parseFloat(lines[7]);

            if (handicap === 0 && Math.floor(komi) === komi) {
                komi += 0.5;
            }
        } catch (e) {
            // Use defaults
        }

        let re = "";
        try {
            if (lines[10] && lines[10].includes("hite win")) {
                re = "W+";
            } else if (lines[10] && lines[10].includes("lack win")) {
                re = "B+";
            }
        } catch (e) {
            // Ignore
        }

        if (handicap < 0 || handicap > 9) {
            throw new ParseError(`Handicap ${handicap} out of range`);
        }

        const root = new SGFNode<NodeExpand>(new NodeExpand());
        let node = root;

        // Set root values
        root.setProperty("SZ", boardsize);

        if (handicap >= 2) {
            root.setProperty("HA", handicap);
            root.placeHandicapStones(handicap, true); // While this isn't Tygem, it uses the same layout
        }

        if (komi) {
            root.setProperty("KM", komi);
        }

        if (rawdate.length === 8) {
            let ok = true;
            for (let n = 0; n < 8; n++) {
                if (!"0123456789".includes(rawdate[n])) {
                    ok = false;
                    break;
                }
            }
            if (ok) {
                const date = `${rawdate.substring(0, 4)}-${rawdate.substring(4, 6)}-${rawdate.substring(6, 8)}`;
                root.setProperty("DT", date);
            }
        }

        if (pw) {
            root.setProperty("PW", pw);
        }
        if (pb) {
            root.setProperty("PB", pb);
        }
        if (re) {
            root.setProperty("RE", re);
        }

        // Main parser
        for (const line of lines) {
            const trimmedLine = line.trim().toUpperCase();
            if (trimmedLine.length >= 7 && trimmedLine.startsWith("PM")) {
                if (["B", "W"].includes(trimmedLine[4])) {
                    const key = trimmedLine[4];
                    const rawMove = trimmedLine.substring(5, 7).toLowerCase();
                    let value: string;
                    if (rawMove === "aa") {
                        value = ""; // pass
                    } else {
                        // Convert to SGF format (out-by-1)
                        value = String.fromCharCode(rawMove.charCodeAt(0) - 1) + 
                                String.fromCharCode(rawMove.charCodeAt(1) - 1);
                    }

                    node = new SGFNode<NodeExpand>(new NodeExpand() ,null, node);
                    node.setProperty(key, value);
                }
            }
        }

        if (root.children.length === 0) {
            throw new ParseError("Found no moves");
        }

        return root;
    }

    // GIB parser adapted from https://github.com/fohristiwhirl/gofish/
    static parseGib(gib: string): SGFNode<NodeExpand> {
        const parsePlayerName = (raw: string): [string, string] => {
            let name = raw;
            let rank = "";
            const foo = raw.split("(");
            if (foo.length === 2) {
                if (foo[1].endsWith(")")) {
                    name = foo[0].trim();
                    rank = foo[1].substring(0, foo[1].length - 1);
                }
            }
            return [name, rank];
        };

        const gibMakeResult = (grlt: number, zipsu: number): string => {
            const easycases: Record<number, string> = {3: "B+R", 4: "W+R", 7: "B+T", 8: "W+T"};

            if (grlt in easycases) {
                return easycases[grlt];
            }

            if ([0, 1].includes(grlt)) {
                return `${grlt === 0 ? "B" : "W"}+${zipsu / 10}`;
            }

            return "";
        };

        const gibGetResult = (line: string, grltRegex: RegExp, zipsuRegex: RegExp): string => {
            try {
                const grltMatch = line.match(grltRegex);
                const zipsuMatch = line.match(zipsuRegex);
                if (grltMatch && zipsuMatch) {
                    const grlt = parseInt(grltMatch[1]);
                    const zipsu = parseInt(zipsuMatch[1]);
                    return gibMakeResult(grlt, zipsu);
                }
            } catch (e) {
                // Ignore
            }
            return "";
        };

        const root = new SGFNode<NodeExpand>(new NodeExpand());
        let node = root;

        const lines = gib.split("\n");
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith("\\[GAMEBLACKNAME=") && trimmedLine.endsWith("\\]")) {
                const s = trimmedLine.substring(16, trimmedLine.length - 2);
                const [name, rank] = parsePlayerName(s);
                if (name) {
                    root.setProperty("PB", name);
                }
                if (rank) {
                    root.setProperty("BR", rank);
                }
            }

            if (trimmedLine.startsWith("\\[GAMEWHITENAME=") && trimmedLine.endsWith("\\]")) {
                const s = trimmedLine.substring(16, trimmedLine.length - 2);
                const [name, rank] = parsePlayerName(s);
                if (name) {
                    root.setProperty("PW", name);
                }
                if (rank) {
                    root.setProperty("WR", rank);
                }
            }

            if (trimmedLine.startsWith("\\[GAMEINFOMAIN=")) {
                const result = gibGetResult(trimmedLine, /GRLT:(\d+),/, /ZIPSU:(\d+),/);
                if (result) {
                    root.setProperty("RE", result);
                    try {
                        const komiMatch = trimmedLine.match(/GONGJE:(\d+),/);
                        if (komiMatch) {
                            const komi = parseInt(komiMatch[1]) / 10;
                            if (komi) {
                                root.setProperty("KM", komi);
                            }
                        }
                    } catch (e) {
                        // Ignore
                    }
                }
            }

            if (trimmedLine.startsWith("\\[GAMETAG=")) {
                if (!root.properties.has("DT")) {
                    try {
                        const match = trimmedLine.match(/C(\d{4}):(\d{2}):(\d{2})/);
                        if (match) {
                            const date = `${match[1]}-${match[2]}-${match[3]}`;
                            root.setProperty("DT", date);
                        }
                    } catch (e) {
                        // Ignore
                    }
                }

                if (!root.properties.has("RE")) {
                    const result = gibGetResult(trimmedLine, /,W(\d+),/, /,Z(\d+),/);
                    if (result) {
                        root.setProperty("RE", result);
                    }
                }

                if (!root.properties.has("KM")) {
                    try {
                        const komiMatch = trimmedLine.match(/,G(\d+),/);
                        if (komiMatch) {
                            const komi = parseInt(komiMatch[1]) / 10;
                            if (komi) {
                                root.setProperty("KM", komi);
                            }
                        }
                    } catch (e) {
                        // Ignore
                    }
                }
            }

            if (trimmedLine.substring(0, 3) === "INI") {
                if (node !== root) {
                    throw new ParseError("Node is not root");
                }
                const setup = trimmedLine.split(/\s+/);
                let handicap: number;
                try {
                    handicap = parseInt(setup[3]);
                } catch (e) {
                    continue;
                }

                if (handicap < 0 || handicap > 9) {
                    throw new ParseError(`Handicap ${handicap} out of range`);
                }

                if (handicap >= 2) {
                    root.setProperty("HA", handicap);
                    root.placeHandicapStones(handicap, true);
                }
            }

            if (trimmedLine.substring(0, 3) === "STO") {
                const move = trimmedLine.split(/\s+/);
                const key = move[3] === "1" ? "B" : "W";
                try {
                    const x = parseInt(move[4]);
                    const y = 18 - parseInt(move[5]);
                    if (!(0 <= x && x < 19 && 0 <= y && y < 19)) {
                        throw new ParseError(`Coordinates for move (${x},${y}) out of range on line ${trimmedLine}`);
                    }
                    const value = new Move([x, y]).sgf([19, 19]);

                    node = new SGFNode<NodeExpand>(new NodeExpand());
                    node.setProperty(key, value);
                } catch (e) {
                    continue;
                }
            }
        }

        if (root.children.length === 0) {
            throw new ParseError("No valid nodes found");
        }

        return root;
    }
}