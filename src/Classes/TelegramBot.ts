import { Subject } from "rxjs";
import { Telegraf } from "telegraf";
import { IDouble, IWallet } from "../Types";

//const ADMIN_IDS : number[] = [1363185514, 6133390787]
const ADMIN_IDS : number[] = [1363185514]
export class TelegramBot {
    private bot: Telegraf;
    private wallet: IWallet;
    private double_history: IDouble[] = [];
    private break$: Subject<boolean>;

    constructor(TELEGRAM_KEY: string, wallet_provider: Subject<IWallet>, double_history_provider: Subject<IDouble[]>, break_provider: Subject<boolean>) {
        this.bot = new Telegraf(TELEGRAM_KEY);
        this.break$ = break_provider

        wallet_provider.subscribe(v => this.wallet = v)
        double_history_provider.subscribe(v => this.double_history = v)

        this.setupCommands()
    }

    private setupCommands() {
        this.bot.command('kill', async (ctx) => {
            const msg = "Comando de parada forçada. Parando."
            ADMIN_IDS.forEach(chatId => this.bot.telegram.sendMessage(chatId, msg));
            this.break$.next(true)
        });

        this.bot.command('dados', async (ctx) => {
            const saldo_black = this.double_history.filter(dh => dh.color.toLowerCase() == 'black').length
            const saldo_red = this.double_history.filter(dh => dh.color.toLowerCase() == 'red').length
            const saldo_white = this.double_history.filter(dh => dh.color.toLowerCase() == 'white').length
            
            const total = this.double_history.length

            const msg = `⬛${(saldo_black*100/total).toFixed(2)}%\n🟥${(saldo_red*100/total).toFixed(2)}%\n⬜${(saldo_white*100/total).toFixed(2)}%\n\t Saldo R$ ${this.wallet?.real_balance}`
            ctx.reply(msg);
        });

        this.bot.start((ctx) => this.start(ctx));
        this.bot.launch();

        // Enable graceful stop
        process.once('SIGINT', () => this.botParou());
        process.once('SIGTERM', () => this.botParou());
    }


    public notify_vitoria() {
        const msg = `Ganhamos ❤️` // | Saldo: R$ ${saldo}`
        ADMIN_IDS.forEach(chatId => this.bot.telegram.sendMessage(chatId, msg));
    }

    public notify_perda() {
        const msg = "Acabamos de perder </3, resetando."
        ADMIN_IDS.forEach(chatId => this.bot.telegram.sendMessage(chatId, msg));
    }

    public notify_aposta(valor_aposta: number, cor: string) {
        const aposta_humanizada = valor_aposta.toFixed(2)
        const msg = `Apostando R$ ${aposta_humanizada} no ${cor}`// | Saldo: R$ ${saldo} | Derrotas: ${loses}`
        ADMIN_IDS.forEach(chatId => this.bot.telegram.sendMessage(chatId, msg));
    }

    private start(ctx) {
        ctx.reply('Welcome');
        console.log(ctx.message.chat.id, "added")
        ADMIN_IDS.push(ctx.message.chat.id);
    }

    private botParou() {
        const msg = "Bot parou. Algo de errado aconteceu."
        ADMIN_IDS.forEach(chatId => this.bot.telegram.sendMessage(chatId, msg));
        this.bot.stop()
    }
}