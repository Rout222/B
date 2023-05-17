import { DoubleUpdate, DoubleUpdateV2, IWallet, ColorBet, makeConnectionBlaze, IDoubleBet, ColorToBet, colorText } from "../src"
import { writeFileSync } from 'fs';
import { join } from 'path';


const request = require('request');

const url_wallet = "https://blaze.com/api/wallets"
const url_bet = "https://blaze.com/api/roulette_bets"
const bearer = `Bearer ${process.env.BLAZE_KEY}`
const telegram_key = process.env.TELEGRAM_KEY

const { Telegraf } = require('telegraf');

var chatIds : number[] = [1363185514, 6133390787]

const bot = new Telegraf(telegram_key);

function notify_vitoria() {
    const msg = "Ganhamos ❤️ | Saldo: R$ ${saldo}"
    chatIds.forEach(chatId => bot.telegram.sendMessage(chatId, msg));
}

function notify_perda() {
    const msg = "Acabamos de perder </3, resetando."
    chatIds.forEach(chatId => bot.telegram.sendMessage(chatId, msg));
}

function notify_aposta(valor_aposta: number, cor: string) {
    const aposta_humanizada = valor_aposta.toFixed(2)
    const msg = `Apostando R$ ${aposta_humanizada} no ${cor} | Saldo: R$ ${saldo}`
    chatIds.forEach(chatId => bot.telegram.sendMessage(chatId, msg));
}

function start (ctx) {
    ctx.reply('Welcome');
    console.log(ctx.message.chat.id, "added")
    chatIds.push(ctx.message.chat.id);    
}

bot.start((ctx) => start(ctx));
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));


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
        const wallets : IWallet[] = JSON.parse(body)
        wallet = wallets[0]
        saldo = parseFloat(wallets[0].real_balance);
    });
}

var saldo = 0;

atualizarWallet()


var valor_aposta_inicial = 0.1;
var valor_aposta  = valor_aposta_inicial
const gale = 2.1
var esperar_threshold_resetar = false

function writeHeader(filename) {
    const output = "cor_com_maior_aposta, valor_aposta, loses_seguidas, winner, data, saldo, saldo_red_total, saldo_black_total, saldo_red_ultima_hora, saldo_black_ultima_hora"
    writeFileSync(join(__dirname, filename), output + "\n", {
        flag: 'a+',
      });
}

// ✅ write to file SYNCHRONOUSLY
function syncWriteFile(data: any) {
    let yourDate = new Date()
    const filename = yourDate.toISOString().split('T')[0] + ".csv"
    const output = `${data['aposta']},${data['valor_aposta']},${data['LosesSeguidas']},${data['winner']},${data['data']},${data['saldo']},${saldoRedTotal()},${saldoBlackTotal()},${saldoRedUltimaHora()},${saldoBlackUltimaHora()}`

    writeFileSync(join(__dirname, filename), output + "\n", {
    flag: 'a+',
  });
}

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
        console.log(bet)
    });

    notify_aposta(valor, cor)
}

socket.ev.on('double.tick', (msg) => {
    if (isV2(msg)) {

        if(lastId != msg.id && secondsUntilEnd(new Date(msg.created_at)) < 5) {
            if(loses > 6) {
                loses = 0
                notify_perda()
            }
            lastId = msg.id;
            writeWinner = true

            if(!horaDeApostar){
                if(tem_dados_da_ultima_hora()) {
                    if(saldoRedUltimaHora() < threshhold && saldoBlackUltimaHora() < threshhold) {
                        esperar_threshold_resetar = false
                    }

                    if(saldoRedUltimaHora() >= threshhold && !esperar_threshold_resetar) {
                        aposta = "Black"
                        horaDeApostar = true
                        valor_aposta = valor_aposta_inicial
                        loses = 0
                    }
                    if(saldoBlackUltimaHora() >= threshhold && !esperar_threshold_resetar) {
                        aposta = "Red"
                        horaDeApostar = true
                        valor_aposta = valor_aposta_inicial
                        loses = 0
                    }
                }

            }           

            valor_aposta = (loses > 0) ? valor_aposta * gale : valor_aposta;

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

                
                syncWriteFile(output);

                writeWinner = false;
            }
        }
    }
})