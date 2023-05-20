import { Subject } from "rxjs";
import { DoubleBet, IDouble, IWallet } from "../Types";
import { BlazeAPI } from "./BlazeAPI";
import { TelegramBot } from "./TelegramBot";
import { secondsUntilEnd } from "../Utils";

const INTERVALO_CLOCK = 5000
const APOSTAR_NOS_ULTIMOS_SEGUNDOS = 7
const GALE_MAXIMO = 6

const TRESHOLD_MARE = 0.55
const TRESHOLD_RESETAR = 0.54

export class Gamemaster {
    private wallet : IWallet;
    private doubleHistory : IDouble[] = [];
    private interval : NodeJS.Timer;

    private readonly clock$ = new Subject<void>();

    private lastBet : IDouble = null;

    private aposta : DoubleBet;

    constructor(private api : BlazeAPI, private bot : TelegramBot) {
        this.aposta = {
            apostando: false,
            gale: 0,
            color: "Não jogou",
            resetando: true
        }
        this.setupClock()
        api.wallet$.subscribe(v => this.wallet = v)
        api.doubleHistory$.subscribe(v => {
            console.log("Clock")
            this.doubleHistory = v;
            this.run()
        })       
    }

    private setupClock () {
        this.interval = setInterval(() => {
            console.log("Clock")
            this.api.updateDoubleHistory();
        }, INTERVALO_CLOCK)

    }

    private horaDeApostar(bet: IDouble) : boolean {
        const d = new Date(bet.created_at);
        return secondsUntilEnd(d) < APOSTAR_NOS_ULTIMOS_SEGUNDOS && !this.aposta.resetando;
    }

    private analisarMomentoDeAposta() {

        if(!this.aposta.apostando && this.saldoRedUltimaHora() >= TRESHOLD_MARE) {
            console.log("Apostando Black")
            this.aposta.apostando = true
            this.aposta.color = 'black'
        }

        if(!this.aposta.apostando && this.saldoBlackUltimaHora() >= TRESHOLD_MARE) {
            console.log("Apostando Red")
            this.aposta.apostando = true
            this.aposta.color = 'red'
        }

        if(this.aposta.apostando) {
            this.api.bet()
            this.bot.notify_aposta(0, this.aposta.color)
        }

    }

    private analisaReset() {
        if (Math.max(this.saldoRedUltimaHora(), this.saldoBlackUltimaHora()) <= TRESHOLD_RESETAR) {
            console.log("Resetando")
            this.aposta.resetando = false
        }
    }

    private analisarSeGanhamos(nextBet: IDouble) {
        if (!this.aposta.apostando) {
            return;
        }

        const ganhamos = nextBet.color == this.aposta.color

        if(ganhamos) {
            console.log("Ganhamos")
            this.aposta.apostando = false
            this.aposta.resetando = true
            this.aposta.gale = 0;
            this.bot.notify_vitoria()
            return
        }

        console.log("Perdemos")

        this.aposta.gale += 1

        if(this.aposta.gale > GALE_MAXIMO) {
            console.log("Quebramos")
            this.aposta.gale = 0
            this.bot.notify_perda()
        }
    }

    private run() {
        const nextBet = this.doubleHistory[-1]
        if (nextBet.id != this.lastBet?.id) {
            this.analisaReset()
            this.analisarSeGanhamos(nextBet)
            if(!this.aposta.resetando && this.horaDeApostar(nextBet)) {
                this.lastBet = nextBet
                this.analisarMomentoDeAposta()
            }            
        }



    }


    private saldoRedUltimaHora(){
        return this.doubleHistory.filter( (lance) => { return  lance.color.toLowerCase() == "red"}).length / this.doubleHistory.length || 0
    }
    
    private saldoBlackUltimaHora(){
        return this.doubleHistory.filter( (lance) => {return  lance.color.toLowerCase() == "black"}).length / this.doubleHistory.length || 0
    }
}