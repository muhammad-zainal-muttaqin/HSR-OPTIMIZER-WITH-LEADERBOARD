import { useCallback, useEffect, useMemo, useState } from 'react'
import { Select, Table, Typography, Flex, Avatar } from 'antd'
import { useTranslation } from 'react-i18next'
import { Assets } from 'lib/rendering/assets'
import { apiUrl } from 'api/client'
import gameData from 'data/game_data.json' with { type: 'json' }

const REGION_LABELS: Record<string, string> = {
  ASIA: 'Asia',
  NA: 'North America',
  EU: 'Europe',
  TW: 'Taiwan / HK / MO',
  CN: 'China',
}

type Entry = {
  id: string
  uid: string
  region: string | null
  characterId: number
  level: number
  eidolon: number
  lightConeId: number | null
  cv: number
  critRate: number | null
  critDmg: number | null
  atk: number | null
  spd: number | null
  createdAt: string
}

type CharacterOption = {
  value: number
  label: string
  avatar: string
}

export default function LeaderboardTab() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [characterId, setCharacterId] = useState<number | undefined>(undefined)
  const [region, setRegion] = useState<string | undefined>(undefined)
  const { t: tCharacters } = useTranslation('gameData', { keyPrefix: 'Characters' })
  const { t: tLightcones } = useTranslation('gameData', { keyPrefix: 'Lightcones' })

  const formatWhole = useMemo(
    () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }),
    [],
  )
  const formatOneDecimal = useMemo(
    () => new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 }),
    [],
  )
  const formatNumber = useCallback(
    (value: number | null, formatter: Intl.NumberFormat = formatWhole, suffix: string = '') =>
      value == null || Number.isNaN(value) ? '—' : `${formatter.format(value)}${suffix}`,
    [formatWhole],
  )

  const characterOptions = useMemo<CharacterOption[]>(() => {
    return Object.entries(gameData.characters)
      .filter(([id, data]) => /^\d+$/.test(id) && data?.unreleased === false)
      .map(([id, data]) => {
        const label = tCharacters(`${id}.LongName`, { defaultValue: data?.name ?? `#${id}` })
        return {
          value: Number(id),
          label,
          avatar: Assets.getCharacterAvatarById(id),
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [tCharacters])

  const normalizeEntry = useCallback((entry: any): Entry => ({
    id: String(entry.id),
    uid: String(entry.uid),
    region: entry.region != null ? String(entry.region).toUpperCase() : null,
    characterId: Number(entry.characterId),
    level: Number(entry.level ?? 0),
    eidolon: Number(entry.eidolon ?? 0),
    lightConeId: entry.lightConeId != null ? Number(entry.lightConeId) : null,
    cv: Number(entry.cv ?? 0),
    critRate: entry.critRate != null ? Number(entry.critRate) : null,
    critDmg: entry.critDmg != null ? Number(entry.critDmg) : null,
    atk: entry.atk != null ? Number(entry.atk) : null,
    spd: entry.spd != null ? Number(entry.spd) : null,
    createdAt: entry.createdAt ?? '',
  }), [])

  useEffect(() => {
    const refreshData = () => {
      const path = characterId != null
        ? `/api/leaderboard/character/${characterId}?limit=100${region ? `&region=${encodeURIComponent(region)}` : ''}`
        : `/api/leaderboard/global?limit=100${region ? `&region=${encodeURIComponent(region)}` : ''}`
      fetch(apiUrl(path))
        .then(r => r.json())
        .then((data) => Array.isArray(data) ? setEntries(data.map(normalizeEntry)) : setEntries([]))
        .catch(() => setEntries([]))
    }
    refreshData()
    const handler = () => refreshData()
    window.addEventListener('leaderboard-refresh', handler)
    return () => window.removeEventListener('leaderboard-refresh', handler)
  }, [characterId, normalizeEntry, region])

  const regionSelectOptions = useMemo(
    () => Object.entries(REGION_LABELS).map(([value, label]) => ({ value, label })),
    [],
  )

  const columns = useMemo(() => ([
    {
      title: 'Character',
      key: 'character',
      render: (_: unknown, entry: Entry) => {
        const characterKey = `${entry.characterId}.Name`
        const name = tCharacters(characterKey, { defaultValue: `#${entry.characterId}` })
        const levelAndEidolon = `Lv${entry.level} • E${entry.eidolon}`
        const lightConeName = entry.lightConeId && entry.lightConeId > 0
          ? tLightcones(`${entry.lightConeId}.Name`, { defaultValue: `#${entry.lightConeId}` })
          : null

        return (
          <Flex align='center' gap={10}>
            <img
              src={Assets.getCharacterAvatarById(String(entry.characterId))}
              alt={name}
              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
            />
            <Flex vertical gap={2}>
              <Typography.Text strong>{name}</Typography.Text>
              <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                {levelAndEidolon}
              </Typography.Text>
              {lightConeName ? (
                <Flex align='center' gap={6}>
                  <img
                    src={Assets.getLightConeIconById(String(entry.lightConeId))}
                    alt={lightConeName}
                    style={{ width: 20, height: 20, objectFit: 'cover' }}
                  />
                  <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                    {lightConeName}
                  </Typography.Text>
                </Flex>
              ) : null}
            </Flex>
          </Flex>
        )
      },
    },
    {
      title: 'CV',
      dataIndex: 'cv',
      key: 'cv',
      sorter: (a: Entry, b: Entry) => Number(b.cv) - Number(a.cv),
      render: (value: number) => formatNumber(value, formatOneDecimal),
    },
    {
      title: 'CR',
      dataIndex: 'critRate',
      key: 'cr',
      render: (value: number | null) => formatNumber(value, formatOneDecimal, '%'),
    },
    {
      title: 'CD',
      dataIndex: 'critDmg',
      key: 'cd',
      render: (value: number | null) => formatNumber(value, formatOneDecimal, '%'),
    },
    {
      title: 'ATK',
      dataIndex: 'atk',
      key: 'atk',
      render: (value: number | null) => formatNumber(value, formatWhole),
    },
    {
      title: 'SPD',
      dataIndex: 'spd',
      key: 'spd',
      render: (value: number | null) => formatNumber(value, formatOneDecimal),
    },
    {
      title: 'UID',
      dataIndex: 'uid',
      key: 'uid',
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
    },
    {
      title: 'Region',
      dataIndex: 'region',
      key: 'region',
      render: (value: string | null) => value ? (REGION_LABELS[value] ?? value) : '—',
    },
  ]), [formatNumber, formatOneDecimal, formatWhole, tCharacters, tLightcones])

  return (
    <Flex vertical gap={8} style={{ width: '100%' }}>
      <Typography.Title level={4}>Leaderboard</Typography.Title>
      <Flex gap={8}>
        <Select
          allowClear
          placeholder="Character"
          style={{ width: 200 }}
          value={characterId}
          onChange={(v) => setCharacterId(v === undefined ? undefined : v)}
          options={characterOptions}
          showSearch
          optionFilterProp="label"
          optionRender={(option) => {
            const data = option.data as CharacterOption
            return (
              <Flex align='center' gap={8}>
                <Avatar size={24} src={data.avatar} />
                <span>{data.label}</span>
              </Flex>
            )
          }}
        />
        <Select
          allowClear
          placeholder="Region"
          style={{ width: 160 }}
          onChange={(v) => setRegion(v)}
          options={regionSelectOptions}
        />
      </Flex>
      <Table
        size="small"
        rowKey={(x) => String(x.id)}
        dataSource={entries}
        columns={columns as any}
        pagination={{ pageSize: 25 }}
      />
    </Flex>
  )
}


