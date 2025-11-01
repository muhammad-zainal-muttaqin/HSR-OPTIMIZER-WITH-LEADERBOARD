export async function fetchGlobalLeaderboard(limit = 100, region?: string) {
  const url = `/api/leaderboard/global?limit=${limit}${region ? `&region=${encodeURIComponent(region)}` : ''}`
  const res = await fetch(url)
  return await res.json()
}

export async function fetchCharacterLeaderboard(characterId: number, limit = 100, region?: string) {
  const url = `/api/leaderboard/character/${characterId}?limit=${limit}${region ? `&region=${encodeURIComponent(region)}` : ''}`
  const res = await fetch(url)
  return await res.json()
}


