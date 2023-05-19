export interface IBet {
    id: string,
    cashed_out_at: number | null,
    amount: number,
    currency_type: string,
    user: {
        id: string,
        id_str: string,
        username: string,
        rank: string
    },
    win_amount: string,
    status: 'win' | 'created'
}


export interface IDoubleBet {
    "amount": string,
    "currency_type": "BRL",
    "color": 0 | 1 | 2,
    "free_bet": false,
    "wallet_id": number
}