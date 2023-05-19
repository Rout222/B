import {
    CoreOptions,
    RxHR,
    RxHttpRequestResponse,
} from "@akanass/rx-http-request";

import { Subject } from "rxjs";
import { ICrashHistory, IDoubleHistory, IWallet } from "../Types";

const URL_WALLET = "https://blaze.com/api/wallets";
const URL_DOUBLE_BETS = "https://blaze.com/api/roulette_bets";
const URL_DOUBLE_HISTORY = "https://blaze.com/api/roulette_games/history";
const URL_CRASH_HISTORY = "https://blaze.com/api/crash_games/history"

export class BlazeAPI {
    private token: string;

    public readonly disconnected$ = new Subject<void>();
    public readonly wallet$ = new Subject<IWallet>();
    public readonly doubleHistory$ = new Subject<string[]>();
    public readonly crashHistory$ = new Subject<number[]>()

    constructor(token: string) {
        this.token = token;
    }

    private getDefaultOptions(): CoreOptions {
        return {
            headers: {
                "User-Agent": "Rx-Http-Request",
            },
            json: true,
        };
    }

    private getAuthOptions(): CoreOptions {
        return {
            auth: {
                bearer: "bearerToken",
            },
            headers: {
                "User-Agent": "Rx-Http-Request",
            },
            json: true,
        };
    }

    updateDoubleHistory() {
        RxHR.get<IDoubleHistory>(
            URL_DOUBLE_HISTORY,
            this.getDefaultOptions()
        ).subscribe((req) => {
            const dados = req.body.records.slice(0, 119);
            const winners = dados
                .reverse()
                .map(
                    (dado) =>
                        dado.color.charAt(0).toUpperCase() + dado.color.slice(1)
                );

            this.doubleHistory$.next(winners);
        });
    }

    updateWallet() {
        RxHR.get<IWallet[]>(URL_WALLET, this.getAuthOptions()).subscribe(
            (req) => {
                const wallet = req.body[0]
                this.wallet$.next(wallet);
            }
        );
    }

    updateCrashHistory() {
        RxHR.get<ICrashHistory>(
            URL_CRASH_HISTORY,
            this.getDefaultOptions()
        ).subscribe((req) => {
            const dados_ultima_hora = req.body.records.filter(dado => {
                const diff = new Date().getTime() - new Date(dado.created_at).getTime();
                var minutes = Math.floor((diff/1000)/60);

                return minutes <= 60
            });

            const winners = dados_ultima_hora
                .reverse()
                .map(
                    (dado) => parseFloat(dado.crash_point)
                );

            this.crashHistory$.next(winners);
        });
    }
}
