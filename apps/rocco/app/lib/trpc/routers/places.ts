import { router } from '../context'
import { addToLists } from './places.addToLists'
import { autocomplete } from './places.autocomplete'
import { create } from './places.create'
import { remove } from './places.delete'
import { deleteVisit } from './places.deleteVisit'
import { getDetailsByGoogleId } from './places.getDetailsByGoogleId'
import { getDetailsById } from './places.getDetailsById'
import { getMyVisits } from './places.getMyVisits'
import { getNearbyFromLists } from './places.getNearbyFromLists'
import { getPlaceVisits } from './places.getPlaceVisits'
import { getVisitStats } from './places.getVisitStats'
import { logVisit } from './places.logVisit'
import { removeFromList } from './places.removeFromList'
import { update } from './places.update'
import { updateVisit } from './places.updateVisit'

export const placesRouter = router({
  create,
  update,
  delete: remove,
  autocomplete,
  getDetailsById,
  getDetailsByGoogleId,
  addToLists,
  removeFromList,
  getNearbyFromLists,
  logVisit,
  getMyVisits,
  getPlaceVisits,
  updateVisit,
  deleteVisit,
  getVisitStats,
})
