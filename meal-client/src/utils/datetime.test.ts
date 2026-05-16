import { describe, expect, it } from 'vitest'
import { formatIsoAsLocalDateTime } from './datetime'

describe('formatIsoAsLocalDateTime', () => {
  it('returns a non-empty locale string for a valid ISO timestamp', () => {
    const formatted = formatIsoAsLocalDateTime('2024-01-15T10:30:00Z')
    expect(formatted).not.toBe('')
    expect(formatted).not.toBe('2024-01-15T10:30:00Z')
  })

  it('returns the original string when the input is not a valid date', () => {
    expect(formatIsoAsLocalDateTime('not-a-date')).toBe('not-a-date')
  })

  it('returns the original string when given an empty string', () => {
    expect(formatIsoAsLocalDateTime('')).toBe('')
  })
})
