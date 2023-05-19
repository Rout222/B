import { Subject } from "rxjs";
import { expand, map, reduce, skip, takeWhile } from "rxjs/operators";
import { BlazeAPI, ICrash, ICrashHistory } from "../src";
import { RxHR } from "@akanass/rx-http-request";
const treshhold_point = 2;
const treshhold_mare = 0.55;

class CrashQueue {
    private queue: number[];
    private maxSize: number;

    constructor(maxSize: number) {
        this.queue = [];
        this.maxSize = maxSize;
    }

    enqueue(item: number) {
        if (this.isReady()) {
            if(this.prever()) {
                const resultado = (item >= treshhold_point) ?  "Ganhou"  : "Perdeu"
                console.log(`Jogou, ${item}, ${resultado}`)

            } else {
                console.log(`Não jogou, ${item}, não jogou`)    
            }
        } else {
            console.log(`SEM_DADOS_DA_ULTIMA_HORA, ${item}, não jogou`)
        }

        this.queue.push(item);
        if (this.queue.length > this.maxSize) {
            this.queue.shift();
        }
    }

    prever() {
        return validar(this.queue);
    }

    isReady(): boolean {
        return this.queue.length == this.maxSize;
    }
}

const queue = new CrashQueue(130);

const api = new BlazeAPI("TOKEN");

const crashHistory$: Subject<number[]> = api.crashHistory$;

function validar(crashes: number[]): boolean {
    const percent =
        crashes.filter((c) => c < treshhold_point).length / crashes.length;

    return percent >= treshhold_mare;
}

const baseUrl = "https://blaze.com/api/crash_games/history";
const startDate = "2023-04-19T13:00:00.000Z";
const endDate = "2023-05-19T15:00:00.000Z";

function fetchCrashHistory(page) {
    const url = `${baseUrl}?startDate=${startDate}&endDate=${endDate}&page=${page}`;
    return RxHR.get<ICrashHistory>(url, {
        headers: {
            "User-Agent": "Rx-Http-Request",
        },
        json: true,
    }).pipe(map((response) =>  response.body));
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
        reduce((allRecords: number[], data) => {
            if (primeira_execucao) {
                return []
            }
            const crashes = data.records.reverse().map((d) => parseFloat(d.crash_point));

            crashes.forEach((c) => {
                queue.enqueue(c);
            });

            return allRecords.concat(crashes);
        }, [])
    );
}


fetchAllCrashHistory().subscribe((result) => {
    console.log(result);
});
