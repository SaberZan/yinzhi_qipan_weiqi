// katrain/core/base_katrain.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import config from './config';

// 导入外部模块中的常量（需要在对应文件中定义）
import { 
    PLAYER_HUMAN, 
    PLAYER_AI, 
    PLAYING_NORMAL, 
    PLAYING_TEACHING, 
    OUTPUT_INFO, 
    OUTPUT_ERROR, 
    OUTPUT_DEBUG, 
    AI_DEFAULT, 
    CONFIG_MIN_VERSION, 
} from './constants';

export class Player {
    player: string;
    sgfRank: string | null;
    calculatedRank: number | null;
    name: string;
    playerType!: string;
    playerSubtype!: string;
    periodsUsed: number;
    
    constructor(
        player: string = "B", 
        playerType: string = PLAYER_HUMAN, 
        playerSubtype: string = PLAYING_NORMAL, 
        periodsUsed: number = 0
    ) {
        this.player = player;
        this.sgfRank = null;
        this.calculatedRank = null;
        this.name = "";
        this.update(playerType, playerSubtype);
        this.periodsUsed = periodsUsed;
    }
    
    update(playerType: string = PLAYER_HUMAN, playerSubtype: string = PLAYING_NORMAL): void {
        this.playerType = playerType;
        this.playerSubtype = playerSubtype;
    }
    
    get ai(): boolean {
        return this.playerType === PLAYER_AI;
    }
    
    get human(): boolean {
        return this.playerType === PLAYER_HUMAN;
    }
    
    get beingTaught(): boolean {
        return this.playerType === PLAYER_HUMAN && this.playerSubtype === PLAYING_TEACHING;
    }
    
    get strategy(): string {
        return this.ai ? this.playerSubtype : AI_DEFAULT;
    }
    
    toString(): string {
        return `${this.playerType} (${this.playerSubtype})`;
    }
}