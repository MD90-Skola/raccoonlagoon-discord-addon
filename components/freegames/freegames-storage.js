export async function saveGames(games) {
  const now = Date.now();

  const data = await chrome.storage.local.get(['freeGames', 'freeGamesLastScan']);
  const oldGames = Array.isArray(data.freeGames) ? data.freeGames : [];

  const newGames = games.filter(g => !oldGames.some(old => old.url === g.url));

  await chrome.storage.local.set({
    freeGames: games,
    freeGamesLastScan: now,
    freeGamesNewGames: newGames
  });

  return { allGames: games, newGames, lastScan: now };
}

export async function getGames() {
  return await chrome.storage.local.get([
    'freeGames',
    'freeGamesLastScan',
    'freeGamesNewGames',
    'freeGamesAutoScanEnabled'
  ]);
}
