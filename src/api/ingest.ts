import { ShowcaseSource } from 'lib/characterPreview/CharacterPreviewComponents'
import {
  getPreviewRelics,
  getShowcaseMetadata,
  getShowcaseStats,
} from 'lib/characterPreview/characterPreviewController'
import { Stats } from 'lib/constants/constants'
import { ShowcaseTabCharacter } from 'lib/tabs/tabShowcase/useShowcaseTabStore'
import { Character } from 'types/character'
import { apiUrl } from './client'

type IngestBody = {
  uid: string
  region?: string
  characterId: number
  level: number
  eidolon: number
  lightConeId: number
  stats: { atk?: number; spd?: number; cr: number; cd: number }
}

export async function ingestBuild(body: IngestBody) {
  try {
    const res = await fetch(apiUrl('/api/ingest'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (e) {
    console.warn('Ingest failed:', e)
    throw e
  }
}

export async function ingestFromShowcase(uid: string, characters: ShowcaseTabCharacter[], region?: string) {
  const tasks = characters.map(async (c) => {
    const equippedRelics = Object.values(c.equipped).filter(Boolean)
    if (equippedRelics.length === 0) {
      return
    }

    const character = c as unknown as Character
    const { displayRelics } = getPreviewRelics(ShowcaseSource.SHOWCASE_TAB, character, {})
    const showcaseMetadata = getShowcaseMetadata(character)
    const finalStats = getShowcaseStats(character, displayRelics, showcaseMetadata)

    const percentStat = (stat: string) => Number(finalStats[stat as keyof typeof finalStats] ?? 0) * 100
    const crPercent = percentStat(Stats.CR)
    const cdPercent = percentStat(Stats.CD)
    const atk = Number(finalStats[Stats.ATK] ?? 0)
    const spd = Number(finalStats[Stats.SPD] ?? 0)

    if (!Number.isFinite(crPercent) || !Number.isFinite(cdPercent) || crPercent <= 0 || cdPercent <= 0) {
      console.warn(`[Ingest] Skipping character ${c.id} - invalid CR or CD (cr=${crPercent}, cd=${cdPercent})`)
      return
    }

    const round = (value: number, precision = 1) => Number.isFinite(value) ? Number(value.toFixed(precision)) : 0

    const body = {
      uid,
      region,
      characterId: Number(c.id) || 0,
      level: 80,
      eidolon: c.form.characterEidolon ?? 0,
      lightConeId: Number(c.form.lightCone) || 0,
      stats: {
        atk: Math.round(atk),
        spd: round(spd),
        cr: round(crPercent),
        cd: round(cdPercent),
      },
    }
    
    return ingestBuild(body).catch((e) => {
      console.warn(`[Ingest] Failed for character ${c.id}:`, e)
    })
  })
  
  const results = await Promise.allSettled(tasks)
  const successful = results.filter(r => r.status === 'fulfilled' && r.value !== undefined).length
  return successful
}


