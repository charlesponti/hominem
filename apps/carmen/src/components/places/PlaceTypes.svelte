<script lang="ts">
import PlaceType from './PlaceType.svelte'

export let limit: number | undefined = undefined
export let types: string[] = []

const excludedTypes = ['establishment', 'food', 'point_of_interest', 'political']

const filterExcludedTypes = (type: string) => !excludedTypes.includes(type)

$: isPointOfInterest =
  types.length === 2 && types.includes('establishment') && types.includes('point_of_interest')

$: displayTypes = isPointOfInterest
  ? []
  : types
      .slice(0, limit)
      .filter(filterExcludedTypes)
      .filter((type, index, arr) => {
        if (type === 'store' && arr.length > 1) {
          return false
        }
        return true
      })
</script>

<p class="flex justify-start flex-wrap gap-2">
  {#if isPointOfInterest}
    <PlaceType>Point of Interest</PlaceType>
  {:else}
    {#each displayTypes as type (type)}
      <PlaceType>{type.replace(/_/gi, " ")}</PlaceType>
    {/each}
  {/if}
</p>