import { DoubleUpdate, DoubleUpdateV2, IWallet, ColorBet, makeConnectionBlaze, IDoubleBet, ColorToBet, colorText } from "../src"
import { writeFileSync } from 'fs';
import { join } from 'path';
import { exit } from "process";

var PARADA_OBRIGATORIA : boolean = false;

const request = require('request');

const url_wallet = "https://blaze.com/api/wallets"
const url_bet = "https://blaze.com/api/roulette_bets"
const bearer = `Bearer ${process.env.BLAZE_KEY}`
const telegram_key = process.env.TELEGRAM_KEY

const GALE_MAXIMO = 6

const { Telegraf } = require('telegraf');

var chatIds : number[] = [1363185514, 6133390787]

const bot = new Telegraf(telegram_key);

function aposta_inicial() : number{

    return 0.4;
    //return saldo * (1 - gale_multiplicativo) / (1 - gale_multiplicativo ^ GALE_MAXIMO)
}


bot.command('kill', async (ctx) => {
    const msg = "Comando de parada forçada. Parando."
    chatIds.forEach(chatId => bot.telegram.sendMessage(chatId, msg));
    PARADA_OBRIGATORIA = true
});

bot.command('dados', async (ctx) => {
    const saldo_black = (saldoBlackUltimaHora() * 100).toFixed(2)
    const saldo_red = (saldoRedUltimaHora() * 100).toFixed(2)
    const msg = `Info:\n\t ${saldo_black}% ⬛ \n\t ${saldo_red}% 🟥 \n\t Saldo R$ ${saldo} \n\t Aposta inicial R$ ${aposta_inicial()} \n\t Gale_Multiplicativo ${gale_multiplicativo}x` 
    ctx.reply(msg);
});

async function notify_vitoria() {
    await atualizarWallet()
    const msg = `Ganhamos ❤️ | Saldo: R$ ${saldo}`
    chatIds.forEach(chatId => bot.telegram.sendMessage(chatId, msg));
}

function notify_perda() {
    const msg = "Acabamos de perder </3, resetando."
    chatIds.forEach(chatId => bot.telegram.sendMessage(chatId, msg));
}

function notify_aposta(valor_aposta: number, cor: string) {
    const aposta_humanizada = valor_aposta.toFixed(2)
    const msg = `Apostando R$ ${aposta_humanizada} no ${cor} | Saldo: R$ ${saldo} | Derrotas: ${loses}`
    chatIds.forEach(chatId => bot.telegram.sendMessage(chatId, msg));
}

function start (ctx) {
    ctx.reply('Welcome');
    console.log(ctx.message.chat.id, "added")
    chatIds.push(ctx.message.chat.id);    
}

function botParou() {
    const msg = "Bot parou. Algo de errado aconteceu."
    chatIds.forEach(chatId => bot.telegram.sendMessage(chatId, msg));
}

bot.start((ctx) => start(ctx));
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => botParou());
process.once('SIGTERM', () => botParou());


const options = {
    method: 'GET',
    headers: {
      'User-Agent': 'my request',
      'Authorization': bearer,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

function isV2(msg: DoubleUpdateV2 | DoubleUpdate): msg is DoubleUpdateV2 { //magic happens here
    return (<DoubleUpdateV2>msg).total_red_eur_bet !== undefined;
}

function preencherHistorico(){
    request('https://blaze.com/api/roulette_games/history', { json: true }, (err, res, body) => {
        const dados : Object[] = body['records'].slice(0, 119);
        dados.reverse().forEach(dado => {
            const winner = dado['color'].charAt(0).toUpperCase() + dado['color'].slice(1)
            adicionaWinner(winner)
        });
    });
}

preencherHistorico();

const MAX_TIME = 15;

function secondsUntilEnd(created: Date) : number {
    const now = new Date();
    return Math.max(MAX_TIME - Math.abs(now.getTime() - created.getTime())/1000, 0);
}

function tem_dados_da_ultima_hora() {
    return winners.length > max_aposta_horas
}

var max_aposta_horas = 2 * 60;
var winners : String[] = []

const threshhold : number = 0.55
const threshold_resetar : number = 0.54

function adicionaWinner(winner: string){
    winners.push(winner)
}

function saldoRedTotal() {
    return winners.filter( (lance) => { return lance == "Red"}).length / winners.length || 0
}

function saldoBlackTotal() {
    return winners.filter( (lance) => { return  lance == "Black"}).length / winners.length || 0
}


function saldoRedUltimaHora(){

    const index_inicial = ( winners.length > max_aposta_horas ) ? winners.length - max_aposta_horas : 0

    let lance_ultima_hora = winners.slice(index_inicial)

    return lance_ultima_hora.filter( (lance) => { return  lance == "Red"}).length / lance_ultima_hora.length || 0
}

function saldoBlackUltimaHora(){

    const index_inicial = ( winners.length > max_aposta_horas ) ? winners.length - max_aposta_horas : 0

    let lance_ultima_hora = winners.slice(index_inicial)

    return lance_ultima_hora.filter( (lance) => {return  lance == "Black"}).length / lance_ultima_hora.length || 0
}

let socket = makeConnectionBlaze({
    needCloseWithCompletedSession: false,
    type: 'doubles', // or 'doubles'
    requireNotRepeated: true,
})

var lastId : String = "";
var writeWinner = false;

var output = {};
var loses = 0;
var wallet : IWallet;
async function atualizarWallet(){
    options['url'] = url_wallet
    request(options, (err, res, body) => {
        if(!!err) {
            console.error(err)
            return;
        }
        const wallets : IWallet[] = JSON.parse(body)
        wallet = wallets[0]
        saldo = parseFloat(wallets[0].real_balance);
    });
}

var saldo = 0;

atualizarWallet()

const gale_multiplicativo = 2.1
var valor_aposta  = aposta_inicial()
var esperar_threshold_resetar = true


var horaDeApostar = false
let aposta : colorText
valor_aposta = 0

function apostar(valor: number, cor: colorText){
    const input = {...options}
    input['method'] =  'POST';
    const color = ColorToBet[cor.toString()]
    const aposta : IDoubleBet = {
        "amount": valor.toFixed(2),
        "currency_type": "BRL",
        "color": color,
        "free_bet": false,
        "wallet_id": wallet.id
    }
    input['url'] = url_bet
    input['json'] = aposta
    
    request(input, (err, res, bet) => {
        if(!!err) {
            console.error(err)
            return;
        }
        console.log(bet)
    });

    notify_aposta(valor, cor)
}

socket.ev.on('double.tick', (msg) => {
    if (!PARADA_OBRIGATORIA && isV2(msg)) {

        if(lastId != msg.id && secondsUntilEnd(new Date(msg.created_at)) < 5) {
            if(loses > GALE_MAXIMO) {
                loses = 0
                notify_perda()
            }
            lastId = msg.id;
            writeWinner = true

            if(!horaDeApostar){
                if(tem_dados_da_ultima_hora()) {
                    if(saldoRedUltimaHora() <= threshold_resetar && saldoBlackUltimaHora() <= threshold_resetar) {
                        esperar_threshold_resetar = false
                    }

                    if(saldoRedUltimaHora() >= threshhold && !esperar_threshold_resetar) {
                        aposta = "Black"
                        horaDeApostar = true
                        valor_aposta = aposta_inicial()
                        loses = 0
                    }
                    if(saldoBlackUltimaHora() >= threshhold && !esperar_threshold_resetar) {
                        aposta = "Red"
                        horaDeApostar = true
                        valor_aposta = aposta_inicial()
                        loses = 0
                    }
                }

            }           

            valor_aposta = (loses > 0) ? valor_aposta * gale_multiplicativo : valor_aposta;

            if(horaDeApostar) {
                apostar(valor_aposta, aposta)
                atualizarWallet()
            }

            output = { 
                'aposta' : aposta,
                'valor_aposta' : valor_aposta
            }

        }

        if(writeWinner) {
            atualizarWallet()
            var winner = null
            if (msg.color != null ) {
                winner = ColorBet[msg.color];
            }


            if(winner != null) {
                adicionaWinner(winner)
                if (!horaDeApostar) {
                    output['aposta'] = 'não_jogou'
                    output['valor_aposta'] = 0
                }

                if(horaDeApostar) {
                    if(winner == output["aposta"]) {
                        notify_vitoria()
                        horaDeApostar = false
                        esperar_threshold_resetar = true
                        loses = 0;
                    } else {
                        loses += 1
                    }
                }
                

                output['LosesSeguidas'] = loses
                output['winner'] = winner
                output['data'] = msg.created_at
                output['saldo'] = saldo

                writeWinner = false;
            }
        }
    }
})