import { IBet } from ".";

export type statusdoubles = "complete" | "rolling" | "waiting"
export type colorText = "Red" | "Black" | "White"
export interface DoubleUpdate {
    "type": 'v1';
    "game": 'doubles';
    "isRepeated": boolean;
    "id": string;
    "updated_at": string;
    "status": statusdoubles;
    'bets'?: string[];
    'color': number | null;
    'roll': number | null;
}
export interface DoubleUpdateV2 {
    "type": 'v2';
    "game": 'doubles';
    "isRepeated": boolean;
    "id": string;
    "color": number | null;
    "roll": number | null;
    "created_at": Date;
    "updated_at": Date;
    "status": statusdoubles;
    "bets": IBet[];

    "total_red_eur_bet": number | null;
    "total_red_bets_placed": number | null;
    "total_white_eur_bet": number | null;
    "total_white_bets_placed": number | null;
    "total_black_eur_bet": number | null;
    "total_black_bets_placed": number | null;
}

export const ColorBet  = {
    2 : "black",
    1 : "red",
    0 : "white"
}

export const ColorToBet  = {
    "black": 2,
    "red": 1,
    "white" : 0
}

export interface DoubleBet {
    apostando: boolean,
    gale: number,
    color: string,
    resetando: boolean
}