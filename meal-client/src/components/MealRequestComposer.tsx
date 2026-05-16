import type { Recipe } from '../types'
import { allergenLabel, dietLabel } from '../labels'

interface MealRequestComposerProps {
  recipes: Recipe[]
  pickedRecipeIds: Set<string>
  isCreatingDraft: boolean
  onToggleRecipe: (recipeId: string) => void
  onCreateDraft: () => void
}

export default function MealRequestComposer({
  recipes,
  pickedRecipeIds,
  isCreatingDraft,
  onToggleRecipe,
  onCreateDraft,
}: MealRequestComposerProps) {
  return (
    <>
      <p className="muted">Pick recipes, then create a draft.</p>
      <ul className="recipe-list">
        {recipes.map((recipe) => {
          const isPicked = pickedRecipeIds.has(recipe.id)
          return (
            <li
              key={recipe.id}
              className={`recipe ${isPicked ? 'recipe-picked' : ''}`}
              onClick={() => onToggleRecipe(recipe.id)}
            >
              <div className="recipe-top">
                <input type="checkbox" checked={isPicked} readOnly />
                <span className="recipe-name">{recipe.name}</span>
              </div>
              <div className="recipe-meta">
                <span>
                  Diets: {recipe.compatible_diets.map((d) => dietLabel[d]).join(', ') || '—'}
                </span>
                <span>
                  Allergens: {recipe.allergens.map((a) => allergenLabel[a]).join(', ') || 'none'}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      <div className="actions">
        <button
          className="primary"
          onClick={onCreateDraft}
          disabled={isCreatingDraft || pickedRecipeIds.size === 0}
        >
          {isCreatingDraft ? 'Creating…' : `Create draft (${pickedRecipeIds.size})`}
        </button>
      </div>
    </>
  )
}
