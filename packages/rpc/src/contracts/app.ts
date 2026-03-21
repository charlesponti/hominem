import { Hono } from 'hono'

const stub = () => new Response(null)

const adminContract = new Hono().post('/refresh-google-places', stub)

const chatsContract = new Hono()
  .get('/', stub)
  .post('/', stub)
  .get('/:id', stub)
  .delete('/:id', stub)
  .get('/:id/messages', stub)
  .post('/:id/send', stub)
  .post('/:id/classify', stub)
  .post('/:id/archive', stub)
  .get('/note/:noteId', stub)

const filesContract = new Hono().post('/index', stub)

const financeContract = new Hono()
  .route(
    '/accounts',
    new Hono()
      .post('/list', stub)
      .post('/all', stub)
      .post('/get', stub)
      .post('/with-plaid', stub)
      .post('/connections', stub)
      .post('/institution-accounts', stub),
  )
  .route(
    '/transactions',
    new Hono().post('/list', stub),
  )
  .route(
    '/institutions',
    new Hono().post('/list', stub).post('/create', stub),
  )
  .route(
    '/analyze',
    new Hono()
      .post('/tag-breakdown', stub)
      .post('/monthly-stats', stub)
      .post('/spending-time-series', stub)
      .post('/top-merchants', stub),
  )
  .route('/tags', new Hono().post('/list', stub))
  .route('/runway', new Hono().post('/calculate', stub))

const invitesContract = new Hono()
  .post('/received', stub)
  .post('/sent', stub)
  .post('/by-list', stub)
  .post('/preview', stub)
  .post('/create', stub)
  .post('/accept', stub)
  .post('/decline', stub)
  .post('/delete', stub)

const itemsContract = new Hono().post('/add', stub).post('/remove', stub).post('/by-list', stub)

const listsContract = new Hono()
  .post('/list', stub)
  .post('/get', stub)
  .post('/create', stub)
  .post('/update', stub)
  .post('/delete', stub)
  .post('/delete-item', stub)
  .post('/containing-place', stub)
  .post('/remove-collaborator', stub)

const messagesContract = new Hono().patch('/:messageId', stub).delete('/:messageId', stub)

const mobileContract = new Hono()
  .route('/intents', new Hono().get('/suggestions', stub))
  .route('/voice', new Hono().post('/speech', stub))

const notesContract = new Hono()
  .get('/', stub)
  .post('/', stub)
  .get('/:id', stub)
  .patch('/:id', stub)
  .delete('/:id', stub)
  .post('/:id/archive', stub)
  .post('/sync', stub)

const placesContract = new Hono()
  .post('/create', stub)
  .post('/update', stub)
  .post('/delete', stub)
  .post('/autocomplete', stub)
  .post('/get', stub)
  .post('/get-by-google-id', stub)
  .post('/add-to-lists', stub)
  .post('/remove-from-list', stub)
  .post('/nearby', stub)
  .post('/log-visit', stub)
  .post('/my-visits', stub)
  .post('/place-visits', stub)
  .post('/update-visit', stub)
  .post('/delete-visit', stub)
  .post('/visit-stats', stub)

const reviewContract = new Hono().post('/:reviewItemId/accept', stub).post('/:reviewItemId/reject', stub)

const twitterContract = new Hono().get('/accounts', stub).post('/post', stub)

const userContract = new Hono().post('/delete-account', stub)

export const app = new Hono()
  .basePath('/api')
  .route('/admin', adminContract)
  .route('/chats', chatsContract)
  .route('/files', filesContract)
  .route('/finance', financeContract)
  .route('/invites', invitesContract)
  .route('/items', itemsContract)
  .route('/lists', listsContract)
  .route('/messages', messagesContract)
  .route('/mobile', mobileContract)
  .route('/notes', notesContract)
  .route('/places', placesContract)
  .route('/review', reviewContract)
  .route('/twitter', twitterContract)
  .route('/user', userContract)
