import { describe, expect, it } from 'vitest'
import {
  NEXT_TRANSITION_BY_STATUS,
  TRAY_STATUS_PIPELINE,
  classifyPipelineStep,
} from './trayWorkflow'

describe('TRAY_STATUS_PIPELINE', () => {
  it('starts at CREATED and ends at RETRIEVED', () => {
    expect(TRAY_STATUS_PIPELINE[0]).toBe('CREATED')
    expect(TRAY_STATUS_PIPELINE[TRAY_STATUS_PIPELINE.length - 1]).toBe('RETRIEVED')
  })

  it('contains exactly six statuses with no duplicates', () => {
    expect(TRAY_STATUS_PIPELINE).toHaveLength(6)
    expect(new Set(TRAY_STATUS_PIPELINE).size).toBe(TRAY_STATUS_PIPELINE.length)
  })
})

describe('NEXT_TRANSITION_BY_STATUS', () => {
  it('points each non-terminal status at the next status in the pipeline', () => {
    for (let i = 0; i < TRAY_STATUS_PIPELINE.length - 1; i++) {
      const currentStatus = TRAY_STATUS_PIPELINE[i]
      const expectedNext = TRAY_STATUS_PIPELINE[i + 1]
      expect(NEXT_TRANSITION_BY_STATUS[currentStatus]?.resultingStatus).toBe(expectedNext)
    }
  })

  it('has no transition out of the terminal status', () => {
    expect(NEXT_TRANSITION_BY_STATUS.RETRIEVED).toBeNull()
  })

  it('uses kebab-case-ish api paths for each transition', () => {
    expect(NEXT_TRANSITION_BY_STATUS.CREATED?.apiPath).toBe('start-preparation')
    expect(NEXT_TRANSITION_BY_STATUS.EN_ROUTE?.apiPath).toBe('deliver')
  })
})

describe('classifyPipelineStep', () => {
  it('marks earlier pipeline steps done', () => {
    expect(classifyPipelineStep('CREATED', 'EN_ROUTE')).toBe('done')
  })

  it('marks the current step as current', () => {
    expect(classifyPipelineStep('EN_ROUTE', 'EN_ROUTE')).toBe('current')
  })

  it('marks later pipeline steps pending', () => {
    expect(classifyPipelineStep('DELIVERED', 'CREATED')).toBe('pending')
  })
})
