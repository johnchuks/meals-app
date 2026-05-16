export type DietType =
  | 'REGULAR'
  | 'LOW_SODIUM'
  | 'DIABETIC'
  | 'LOW_FAT'
  | 'VEGAN'

export const DIET_TYPES: DietType[] = [
  'REGULAR',
  'LOW_SODIUM',
  'DIABETIC',
  'LOW_FAT',
  'VEGAN',
]

export type UserRole = 'KITCHEN_STAFF' | 'DIETARY_STAFF'

export type Allergen =
  | 'MILK'
  | 'EGGS'
  | 'FISH'
  | 'SHELLFISH'
  | 'TREE_NUTS'
  | 'PEANUTS'
  | 'WHEAT'
  | 'SOY'
  | 'SESAME'
  | 'DAIRY'
  | 'GLUTEN'
  | 'NUTS'

export const ALLERGENS: Allergen[] = [
  'MILK',
  'EGGS',
  'FISH',
  'SHELLFISH',
  'TREE_NUTS',
  'PEANUTS',
  'WHEAT',
  'SOY',
  'SESAME',
  'DAIRY',
  'GLUTEN',
  'NUTS',
]

export interface Allergy {
  id: string
  allergen: Allergen
  severity: string | null
  recorded_at: string
}

export type ClinicalState =
  | 'ADMITTED'
  | 'IN_TREATMENT'
  | 'OBSERVATION'
  | 'DISCHARGED'

export interface Patient {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  mrn: string
  diet: DietType
  admitted_at: string
  current_clinical_state: ClinicalState
  allergies: Allergy[]
}

export interface Recipe {
  id: string
  name: string
  description: string
  active: boolean
  created_at: string
  allergens: Allergen[]
  compatible_diets: DietType[]
}

export type MealRequestStatus = 'DRAFT' | 'FINALIZED' | 'REJECTED'

export interface MealRequest {
  id: string
  patient_id: string
  status: MealRequestStatus
  rejection_reason: string | null
  finalized_at: string | null
  created_at: string
  updated_at: string
  recipe_ids: string[]
}

export type TrayStatus =
  | 'CREATED'
  | 'PREPARATION_STARTED'
  | 'ACCURACY_VALIDATED'
  | 'EN_ROUTE'
  | 'DELIVERED'
  | 'RETRIEVED'

export interface Tray {
  id: string
  meal_request_id: string
  status: TrayStatus
  created_at: string
  preparation_started_at: string | null
  accuracy_validated_at: string | null
  en_route_at: string | null
  delivered_at: string | null
  retrieved_at: string | null
}

export interface TrayHistory {
  from_status: TrayStatus | null
  to_status: TrayStatus
  transitioned_at: string
}
