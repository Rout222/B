import {TelegramBot, BlazeAPI} from '../src'

const blaze_key = process.env.BLAZE_KEY || ""
const telegram_key = process.env.TELEGRAM_KEY || ""

const api = new BlazeAPI(blaze_key)
const bot = new TelegramBot(telegram_key, api.wallet$, api.doubleHistory$, api.break$);

api.updateWallet()
api.updateDoubleHistory()
