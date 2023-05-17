export interface IWallet  {
    "id": number;
    "primary": boolean;
    "balance": string;
    "bonus_balance": string;
    "real_balance": string;
    "currency_type": string;
    "deposit_currency": {
        "type": string;
        "name": string;
        "symbol": string
    };
    "currency": {
        "type": string;
        "name": string;
        "symbol": string;
        "fiat": boolean
    }
}


export interface IDoubleBet {
    "amount": string,
    "currency_type": "BRL",
    "color": 0 | 1 | 2,
    "free_bet": false,
    "wallet_id": number
}