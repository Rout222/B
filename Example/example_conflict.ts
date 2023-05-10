import { DoubleUpdate, DoubleUpdateV2, color, makeConnectionBlaze } from "../src"
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ✅ write to file SYNCHRONOUSLY
function syncWriteFile(data: any) {
    let yourDate = new Date()
    const filename = yourDate.toISOString().split('T')[0]
    const output = `${data['aposta']},${data['valor_aposta']},${data['LosesSeguidas']},${data['winner']},${data['data']},${data['saldo']}`
    writeFileSync(join(__dirname, filename), output + "\n", {
    flag: 'a+',
  });

  const contents = readFileSync(join(__dirname, filename), 'utf-8');

  return contents;
}

function isV2(msg: DoubleUpdateV2 | DoubleUpdate): msg is DoubleUpdateV2 { //magic happens here
    return (<DoubleUpdateV2>msg).total_red_eur_bet !== undefined;
}

const MAX_TIME = 15;

function secondsUntilEnd(created: Date) : number {
    const now = new Date();
    return Math.max(MAX_TIME - Math.abs(now.getTime() - created.getTime())/1000, 0);
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

socket.ev.on('double.tick', (msg) => {
    if (isV2(msg)) {

        if(lastId != msg.id && secondsUntilEnd(new Date(msg.created_at)) < 1) {
            if(loses > 6) {
                loses = 0
            }
            lastId = msg.id;
            writeWinner = true

            let aposta = "Red";
            if (msg.total_red_eur_bet < msg.total_black_eur_bet ) {
                aposta = "Black"
            }

            valor_aposta = (loses > 0) ? valor_aposta * gale : valor_aposta_inicial;

            saldo = saldo - valor_aposta

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
                if(winner == output["aposta"]) {
                    loses = 0;
                    saldo += (valor_aposta * 2)
                } else {
                    loses += 1
                }

                output['LosesSeguidas'] = loses
                output['winner'] = winner
                output['data'] = msg.created_at
                output['saldo'] = saldo

                
                syncWriteFile('./output2.txt', output);

                console.table(output);

                writeWinner = false;
            }
        }
    }
})