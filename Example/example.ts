import { DoubleUpdate, DoubleUpdateV2, color, makeConnectionBlaze } from "../src"
import { writeFileSync } from 'fs';
import { join } from 'path';

const request = require('request');



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
var saldo = 3000;
var valor_aposta_inicial = 1;
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

var jogando = false
let aposta = "NÃO JOGOU"
valor_aposta = 0

socket.ev.on('double.tick', (msg) => {
    if (isV2(msg)) {

        if(lastId != msg.id && secondsUntilEnd(new Date(msg.created_at)) < 1) {
            if(loses > 6) {
                loses = 0
            }
            lastId = msg.id;
            writeWinner = true

            if(!jogando){

                aposta = "NÃO JOGOU"

                if(tem_dados_da_ultima_hora()) {
                    if(saldoRedUltimaHora() < threshhold && saldoBlackUltimaHora() < threshhold) {
                        esperar_threshold_resetar = false
                    }

                    if(saldoRedUltimaHora() >= threshhold && !esperar_threshold_resetar) {
                        aposta = "Black"
                        jogando = true
                        valor_aposta = valor_aposta_inicial
                        loses = 0
                    }
                    if(saldoBlackUltimaHora() >= threshhold && !esperar_threshold_resetar) {
                        aposta = "Red"
                        jogando = true
                        valor_aposta = valor_aposta_inicial
                        loses = 0
                    }
                }

            }

            

            valor_aposta = (loses > 0) ? valor_aposta * gale : valor_aposta;

            if(jogando) {
                saldo = saldo - valor_aposta
            }

            output = { 
                'aposta' : aposta,
                'valor_aposta' : valor_aposta
            }

        }

        if(writeWinner) {
            var winner = null
            if (msg.color != null ) {
                winner = color[msg.color];
            }


            if(winner != null) {
                adicionaWinner(winner)
                if(jogando) {
                    if(winner == output["aposta"]) {
                        jogando = false
                        esperar_threshold_resetar = true
                        loses = 0;
                        saldo += (valor_aposta * 2)
                    } else {
                        loses += 1
                    }
                }
                

                output['LosesSeguidas'] = loses
                output['winner'] = winner
                output['data'] = msg.created_at
                output['saldo'] = saldo

                
                syncWriteFile(output);

                console.table(output);

                writeWinner = false;
            }
        }
    }
})