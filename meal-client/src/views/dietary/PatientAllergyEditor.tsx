import { useState } from 'react'
import type { Allergen, Allergy } from '../../types'
import { ALLERGENS } from '../../types'
import { allergenLabel } from '../../labels'

interface PatientAllergyEditorProps {
  allergies: Allergy[]
  onAddAllergy: (allergen: Allergen, severity: string | null) => Promise<void> | void
  onRemoveAllergy: (allergyId: string) => Promise<void> | void
}

export default function PatientAllergyEditor({
  allergies,
  onAddAllergy,
  onRemoveAllergy,
}: PatientAllergyEditorProps) {
  const [selectedAllergen, setSelectedAllergen] = useState<Allergen | ''>('')
  const [severityText, setSeverityText] = useState('')

  async function submitNewAllergy(event: React.FormEvent) {
    event.preventDefault()
    if (!selectedAllergen) return
    await onAddAllergy(selectedAllergen, severityText.trim() || null)
    setSelectedAllergen('')
    setSeverityText('')
  }

  const allergensNotYetRecorded = ALLERGENS.filter(
    (candidate) => !allergies.some((existing) => existing.allergen === candidate),
  )

  return (
    <section className="card">
      <h3>Allergies</h3>
      {allergies.length === 0 ? (
        <p className="muted">None recorded.</p>
      ) : (
        <ul className="tag-list">
          {allergies.map((allergy) => (
            <li key={allergy.id} className="tag">
              <span>
                {allergenLabel[allergy.allergen]}
                {allergy.severity ? ` (${allergy.severity})` : ''}
              </span>
              <button
                className="tag-x"
                onClick={() => onRemoveAllergy(allergy.id)}
                aria-label="Remove"
              >×</button>
            </li>
          ))}
        </ul>
      )}
      <form className="row inline-form" onSubmit={submitNewAllergy}>
        <select
          value={selectedAllergen}
          onChange={(e) => setSelectedAllergen(e.target.value as Allergen | '')}
          required
        >
          <option value="">Select allergen…</option>
          {allergensNotYetRecorded.map((allergen) => (
            <option key={allergen} value={allergen}>{allergenLabel[allergen]}</option>
          ))}
        </select>
        <input
          placeholder="Severity (optional)"
          value={severityText}
          onChange={(e) => setSeverityText(e.target.value)}
        />
        <button className="primary" type="submit" disabled={!selectedAllergen}>Add</button>
      </form>
    </section>
  )
}
