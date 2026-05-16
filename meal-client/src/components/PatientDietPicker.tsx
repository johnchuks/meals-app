import type { DietType } from '../types'
import { DIET_TYPES } from '../types'
import { dietLabel } from '../labels'

interface PatientDietPickerProps {
  currentDiet: DietType
  onSelectDiet: (diet: DietType) => void
}

export default function PatientDietPicker({ currentDiet, onSelectDiet }: PatientDietPickerProps) {
  return (
    <section className="card">
      <h3>Diet</h3>
      <div className="diet-row">
        {DIET_TYPES.map((diet) => (
          <button
            key={diet}
            className={`chip ${diet === currentDiet ? 'chip-active' : ''}`}
            onClick={() => diet !== currentDiet && onSelectDiet(diet)}
          >
            {dietLabel[diet]}
          </button>
        ))}
      </div>
    </section>
  )
}
