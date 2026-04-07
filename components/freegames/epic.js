import { scrapeEpic } from './epicgames/epicgames-scanner.js';

export const id     = 'epic';
export const label  = 'Epic';
export const url    = 'https://store.epicgames.com/en-US/free-games';
export const scrape = scrapeEpic;
export const delay  = 3000;
