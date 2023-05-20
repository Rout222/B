import { Subject } from "rxjs";
import { expand, map, reduce, skip, takeWhile } from "rxjs/operators";
import { BlazeAPI, IDouble, IDoubleHistory } from "../src";
import { RxHR } from "@akanass/rx-http-request";
const treshhold_point = 2;
const treshhold_mare = 0.55;
const threshold_resetar: number = 0.54

let saldo : number = 3000
const aposta_base = 1
const gale = 2.1
const max_gale = 7

class CrashQueue {
    private queue: string[];
    private maxSize: number;
    private esperar_threshold_resetar = false
    private loses: number = 0;
    private jogando: boolean = false;
    private aposta: number = aposta_base
    private cor: string;

    constructor(maxSize: number) {
        console.log("ACAO, COR, RESULTADO, PORCENTAGEM_RED,PORCENTAGEM_BLACK, GALE, PRONTO_PRA_JOGAR, SALDO")
        this.queue = [];
        this.maxSize = maxSize;
    }

    enqueue(item: IDouble) {
        let acao = "SEM_DADOS_DA_ULTIMA_HORA"
        let resultado = "STAND BY"

        if(this.loses > max_gale) {
            this.loses = 0
        }

        if (this.isReady()) {
            if ((this.pronto_para_jogar() && this.prever()) || this.jogando) {
                this.aposta = this.aposta * gale
                if (this.loses == 0) {
                    this.aposta = aposta_base

                    this.cor = 'red'
                    if(this.saldoRedUltimaHora() > treshhold_mare) {
                        this.cor = 'black'
                    }
                }
                saldo -= this.aposta
                this.jogando = true
                let ganhou = (item.color == this.cor.toLowerCase())
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


        console.log(`${acao}, ${item.color}, ${resultado}, ${this.saldoRedUltimaHora()}, ${this.saldoBlackUltimaHora()}, ${this.loses}, ${!this.esperar_threshold_resetar}, ${saldo}`)
        this.queue.push(item.color.toLocaleLowerCase());
        if (this.queue.length > this.maxSize) {
            this.queue.shift();
        }
    }

    prever() {
        return this.validar();
    }

    pronto_para_jogar() {
        if (this.esperar_threshold_resetar && Math.max(this.saldoRedUltimaHora(), this.saldoBlackUltimaHora()) < threshold_resetar) {
            this.esperar_threshold_resetar = false;
        }

        return !this.esperar_threshold_resetar
    }

    isReady(): boolean {
        return this.queue.length == this.maxSize;
    }

    saldoRedUltimaHora(){
        return this.queue.filter( (lance) => { return  lance.toLowerCase() == "red"}).length / this.queue.length || 0
    }
    
    saldoBlackUltimaHora(){
        return this.queue.filter( (lance) => {return  lance.toLowerCase() == "black"}).length / this.queue.length || 0
    }

    validar(): boolean {
        return Math.max(this.saldoRedUltimaHora(), this.saldoBlackUltimaHora()) >= treshhold_mare;
    }

}

const queue = new CrashQueue(120);

const api = new BlazeAPI("TOKEN");

const crashHistory$: Subject<number[]> = api.crashHistory$;


const baseUrl = "https://blaze.com/api/roulette_games/history";
const startDate = "2023-02-19T13:00:00.000Z";
const endDate = "2023-05-19T13:00:00.000Z";

function fetchCrashHistory(page) {
    const url = `${baseUrl}?startDate=${startDate}&endDate=${endDate}&page=${page}`;
    return RxHR.get<IDoubleHistory>(url, {
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
        reduce((allRecords: IDouble[], data) => {
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
