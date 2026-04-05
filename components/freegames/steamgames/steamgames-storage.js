export async function saveSteamGames(games) {
  const now = Date.now();

  const data = await chrome.storage.local.get([
    'steamGames',
    'steamLastScan',
    'steamNewGames',
    'steamAutoScanEnabled'
  ]);

  const oldGames = Array.isArray(data.steamGames) ? data.steamGames : [];

  const newGames = games.filter(game =>
    !oldGames.some(old => old.url === game.url)
  );

  await chrome.storage.local.set({
    steamGames: games,
    steamLastScan: now,
    steamNewGames: newGames
  });

  return {
    allGames: games,
    newGames,
    lastScan: now
  };
}

export async function getSteamGames() {
  return await chrome.storage.local.get([
    'steamGames',
    'steamLastScan',
    'steamNewGames',
    'steamAutoScanEnabled'
  ]);
}