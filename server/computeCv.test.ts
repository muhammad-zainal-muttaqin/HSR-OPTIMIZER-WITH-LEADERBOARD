import { describe, expect, it } from 'vitest'
import { computeCv } from './utils'

describe('computeCv', () => {
  it('computes 2*cr + cd', () => {
    expect(computeCv(50, 100)).toBe(200)
    expect(computeCv(0, 0)).toBe(0)
    expect(computeCv(35.5, 89.1)).toBeCloseTo(160.1, 5)
  })
})


