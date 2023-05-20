import {
    CoreOptions,
    RxHR,
    RxHttpRequestResponse,
} from "@akanass/rx-http-request";

import { BehaviorSubject, Subject } from "rxjs";
import { ICrashHistory, IDouble, IDoubleHistory, IWallet } from "../Types";

const URL_WALLET = "https://blaze.com/api/wallets";
const URL_DOUBLE_BETS = "https://blaze.com/api/roulette_bets";
const URL_DOUBLE_HISTORY = "https://blaze.com/api/roulette_games/history";
const URL_CRASH_HISTORY = "https://blaze.com/api/crash_games/history"

export class BlazeAPI {
    private token: string;

    private stopped : boolean;

    public readonly break$ = new BehaviorSubject<boolean>(false);

    public readonly disconnected$ = new Subject<void>();
    public readonly wallet$ = new Subject<IWallet>();
    public readonly doubleHistory$ = new Subject<IDouble[]>();
    public readonly crashHistory$ = new Subject<number[]>()

    constructor(token: string) {
        this.token = token;
        this.break$.subscribe(v => this.stopped = v)
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
                bearer: this.token,
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
            this.doubleHistory$.next(dados.reverse());
        });
    }

    bet() {
        console.log(this.stopped)
        if(this.stopped) {
            return;
        }
        //RxHR.post<IWallet[]>(URL_DOUBLE_BETS, this.getAuthOptions()).subscribe(
        //    (req) => {
        //        const wallet = req.body[0]
        //        this.wallet$.next(wallet);
        //    }
        //);
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
