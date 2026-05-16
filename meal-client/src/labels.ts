import type {
  Allergen,
  ClinicalState,
  DietType,
  MealRequestStatus,
  TrayStatus,
  UserRole,
} from './types'

export const clinicalStateLabel: Record<ClinicalState, string> = {
  ADMITTED: 'Admitted',
  IN_TREATMENT: 'In treatment',
  OBSERVATION: 'Observation',
  DISCHARGED: 'Discharged',
}

export const allergenLabel: Record<Allergen, string> = {
  MILK: 'Milk',
  EGGS: 'Eggs',
  FISH: 'Fish',
  SHELLFISH: 'Shellfish',
  TREE_NUTS: 'Tree nuts',
  PEANUTS: 'Peanuts',
  WHEAT: 'Wheat',
  SOY: 'Soy',
  SESAME: 'Sesame',
  DAIRY: 'Dairy',
  GLUTEN: 'Gluten',
  NUTS: 'Nuts',
}

export const dietLabel: Record<DietType, string> = {
  REGULAR: 'Regular',
  LOW_SODIUM: 'Low sodium',
  DIABETIC: 'Diabetic',
  LOW_FAT: 'Low fat',
  VEGAN: 'Vegan',
}

export const trayStatusLabel: Record<TrayStatus, string> = {
  CREATED: 'Created',
  PREPARATION_STARTED: 'In preparation',
  ACCURACY_VALIDATED: 'Validated',
  EN_ROUTE: 'En route',
  DELIVERED: 'Delivered',
  RETRIEVED: 'Retrieved',
}

export const requestStatusLabel: Record<MealRequestStatus, string> = {
  DRAFT: 'Draft',
  FINALIZED: 'Finalized',
  REJECTED: 'Rejected',
}

export const roleLabel: Record<UserRole, string> = {
  DIETARY_STAFF: 'Dietary staff',
  KITCHEN_STAFF: 'Kitchen staff',
}
