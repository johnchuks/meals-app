import type { TrayStatus } from '../types'
import { trayStatusLabel } from '../labels'
import { TRAY_STATUS_PIPELINE } from '../domain/trayWorkflow'

export type TrayStatusFilterValue = TrayStatus | 'ALL'

interface TrayStatusFilterProps {
  value: TrayStatusFilterValue
  onChange: (next: TrayStatusFilterValue) => void
}

export default function TrayStatusFilter({ value, onChange }: TrayStatusFilterProps) {
  return (
    <div className="filter-row">
      <select value={value} onChange={(e) => onChange(e.target.value as TrayStatusFilterValue)}>
        <option value="ALL">All statuses</option>
        {TRAY_STATUS_PIPELINE.map((status) => (
          <option key={status} value={status}>{trayStatusLabel[status]}</option>
        ))}
      </select>
    </div>
  )
}
