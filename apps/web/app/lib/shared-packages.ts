/**
 * Proof-of-concept: verifies that all shared React packages can be imported
 * and their exports are accessible from apps/web.
 *
 * This file is not used at runtime — it exists to validate the package graph
 * and surface any missing exports during typecheck.
 */

// finance-react
export {
  AccountConnectionDialog,
  AccountHeader,
  AccountSpendingChart,
} from '@hominem/finance-react'

// places-react
export {
  PlacesList,
  PlacesAutocomplete,
  PlaceListItemActions,
  PlaceMap,
  LazyPlaceMap,
  AddToListControl,
  useAddPlaceToLists,
  useRemovePlaceFromList,
} from '@hominem/places-react'

// lists-react
export {
  Lists,
  ListRow,
  ListForm,
  AddPlaceControl,
  AddToListDrawerContent,
  RemoveCollaboratorButton,
  useLists,
} from '@hominem/lists-react'

// invites-react
export {
  SentInvites,
  SentInviteItem,
  SentInviteForm,
  ReceivedInviteItem,
  DeleteInviteButton,
  useSentInvites,
  useReceivedInvites,
} from '@hominem/invites-react'
