const INGREDIENTS = [
  'lettuce',
  'tomato',
  'onion',
  'cheese',
  'bacon',
  'chicken',
  'egg',
  'avocado',
  'pepper',
  'mushroom',
  'spinach',
  'carrot',
] as const

const AppCacheStore = new Map<string, Map<unknown, unknown>>()
const ingredientsCache = new Map<string, number>()
const ingredientsCacheKey = 'ingredients'
const cache = AppCacheStore.get(ingredientsCacheKey) || new Map()
AppCacheStore.set(ingredientsCacheKey, ingredientsCache)

function* getNextIngredient() {
  const currentIngredientIndex = ingredientsCache.get('currentIngredient') || 0
  const nextIngredientIndex = (currentIngredientIndex + 1) % INGREDIENTS.length
  ingredientsCache.set('currentIngredient', nextIngredientIndex)
  const nextIngredient = INGREDIENTS[nextIngredientIndex]
  yield nextIngredient
}

while ((ingredientsCache.get('currentIngredient') || 0) < INGREDIENTS.length) {
  console.log(`Next ingredient: ${getNextIngredient().next().value}`)
}
