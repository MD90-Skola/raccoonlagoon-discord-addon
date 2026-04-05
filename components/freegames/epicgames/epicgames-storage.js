export async function saveGames(games) {
  const now = Date.now();

  const data = await chrome.storage.local.get([
    'epicGames',
    'epicLastScan',
    'epicNewGames',
    'epicAutoScanEnabled'
  ]);

  const oldGames = Array.isArray(data.epicGames) ? data.epicGames : [];

  const newGames = games.filter(game =>
    !oldGames.some(old => old.url === game.url)
  );

  await chrome.storage.local.set({
    epicGames: games,
    epicLastScan: now,
    epicNewGames: newGames
  });

  return {
    allGames: games,
    newGames,
    lastScan: now
  };
}

export async function getGames() {
  return await chrome.storage.local.get([
    'epicGames',
    'epicLastScan',
    'epicNewGames',
    'epicAutoScanEnabled'
  ]);
}