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