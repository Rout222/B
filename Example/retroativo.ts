import { Subject } from "rxjs";
import { expand, map, reduce, skip, takeWhile } from "rxjs/operators";
import { BlazeAPI, ICrash, ICrashHistory } from "../src";
import { RxHR } from "@akanass/rx-http-request";
const treshhold_point = 2;
const treshhold_mare = 0.65;
const threshold_resetar: number = 0.64

let saldo : number = 3000
const aposta_base = 1
const gale = 2.1
const max_gale = 7

class CrashQueue {
    private queue: ICrash[];
    private maxSize: number;
    private esperar_threshold_resetar = false
    private loses: number = 0;
    private jogando: boolean = false;
    private aposta: number = aposta_base

    constructor(maxSize: number) {
        console.log("ACAO, CRASHOU_EM, RESULTADO, PORCENTAGEM_T, GALE, PRONTO_PRA_JOGAR, SALDO")
        this.queue = [];
        this.maxSize = maxSize;
    }

    enqueue(item: ICrash) {
        let acao = "SEM_DADOS_DA_ULTIMA_HORA"
        let resultado = "STAND BY"

        if(this.loses >= max_gale) {
            this.loses = 0
        }

        if (this.isReady()) {
            if ((this.pronto_para_jogar() && this.prever()) || this.jogando) {
                this.aposta = (this.loses > 0) ? this.aposta * gale : aposta_base
                saldo -= this.aposta
                this.jogando = true
                let ganhou = parseFloat(item.crash_point) >= treshhold_point
                acao = "jogou"
                if (ganhou) {
                    this.esperar_threshold_resetar = true
                    this.loses = 0;
                    this.jogando = false
                    saldo += this.aposta * 2
                } else {
                    this.loses += 1
                }

                resultado = (ganhou) ? "Ganhou" : "Perdeu"

            } else {
                acao = "não_jogou"
            }
        }


        console.log(`${acao}, ${item.crash_point}, ${resultado}, ${this.percentagem()}, ${this.loses}, ${!this.esperar_threshold_resetar}, ${saldo}`)
        this.queue.push(item);
        if (this.queue.length > this.maxSize) {
            this.queue.shift();
        }
    }

    prever() {
        return this.validar();
    }

    pronto_para_jogar() {
        if (this.esperar_threshold_resetar && this.percentagem() < threshold_resetar) {
            this.esperar_threshold_resetar = false;
        }

        return !this.esperar_threshold_resetar
    }

    isReady(): boolean {
        return this.queue.length == this.maxSize;
    }

    percentagem(): number {
        return this.queue.filter((c) => parseFloat(c.crash_point) < treshhold_point).length / this.queue.length;

    }

    validar(): boolean {
        return this.percentagem() >= treshhold_mare;
    }

}

const queue = new CrashQueue(130);

const api = new BlazeAPI("TOKEN");

const crashHistory$: Subject<number[]> = api.crashHistory$;


const baseUrl = "https://blaze.com/api/crash_games/history";
const startDate = "2023-02-19T13:00:00.000Z";
const endDate = "2023-04-19T13:00:00.000Z";

function fetchCrashHistory(page) {
    const url = `${baseUrl}?startDate=${startDate}&endDate=${endDate}&page=${page}`;
    return RxHR.get<ICrashHistory>(url, {
        headers: {
            "User-Agent": "Rx-Http-Request",
        },
        json: true,
    }).pipe(map((response) => response.body));
}

function fetchAllCrashHistory() {
    let totalPages = 0;
    var primeira_execucao = true;

    return fetchCrashHistory(1).pipe(
        map((data) => {
            totalPages = data.total_pages;
            return data;
        }),
        expand((data) => {
            primeira_execucao = false;
            totalPages--;
            if (totalPages >= 1) {
                return fetchCrashHistory(totalPages);
            } else {
                return [];
            }
        }),
        takeWhile((data) => totalPages >= 1),
        reduce((allRecords: ICrash[], data) => {
            if (primeira_execucao) {
                return []
            }
            const crashes = data.records.reverse()

            crashes.forEach((c) => {
                queue.enqueue(c);
            });

            return allRecords.concat(crashes);
        }, [])
    );
}


fetchAllCrashHistory().subscribe((result) => {
    
});
