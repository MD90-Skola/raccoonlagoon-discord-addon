import { scrapeSteam } from './steamgames/steamgames-scanner.js';

export const id     = 'steam';
export const label  = 'Steam';
export const url    = 'https://store.steampowered.com/search?maxprice=free&supportedlang=english,swedish&specials=1&ndl=1';
export const scrape = scrapeSteam;
export const delay  = 3000;
