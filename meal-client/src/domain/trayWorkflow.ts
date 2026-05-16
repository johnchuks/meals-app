import type { TrayStatus } from '../types'

export const TRAY_STATUS_PIPELINE: TrayStatus[] = [
  'CREATED',
  'PREPARATION_STARTED',
  'ACCURACY_VALIDATED',
  'EN_ROUTE',
  'DELIVERED',
  'RETRIEVED',
]

export interface TrayTransition {
  buttonLabel: string
  apiPath: string
  resultingStatus: TrayStatus
}

export const NEXT_TRANSITION_BY_STATUS: Record<TrayStatus, TrayTransition | null> = {
  CREATED: {
    buttonLabel: 'Start preparation',
    apiPath: 'start-preparation',
    resultingStatus: 'PREPARATION_STARTED',
  },
  PREPARATION_STARTED: {
    buttonLabel: 'Validate accuracy',
    apiPath: 'validate-accuracy',
    resultingStatus: 'ACCURACY_VALIDATED',
  },
  ACCURACY_VALIDATED: {
    buttonLabel: 'Dispatch',
    apiPath: 'dispatch',
    resultingStatus: 'EN_ROUTE',
  },
  EN_ROUTE: {
    buttonLabel: 'Mark delivered',
    apiPath: 'deliver',
    resultingStatus: 'DELIVERED',
  },
  DELIVERED: {
    buttonLabel: 'Mark retrieved',
    apiPath: 'retrieve',
    resultingStatus: 'RETRIEVED',
  },
  RETRIEVED: null,
}

export type TrayStepState = 'done' | 'current' | 'pending'

export function classifyPipelineStep(
  pipelineStep: TrayStatus,
  currentStatus: TrayStatus,
): TrayStepState {
  const currentIndex = TRAY_STATUS_PIPELINE.indexOf(currentStatus)
  const stepIndex = TRAY_STATUS_PIPELINE.indexOf(pipelineStep)
  if (stepIndex < currentIndex) return 'done'
  if (stepIndex === currentIndex) return 'current'
  return 'pending'
}
