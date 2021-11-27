/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.post('/challenge', 'UsersController.challenge')
  Route.post('/login', 'UsersController.login')
  Route.post('/register', 'UsersController.register')
  Route.get('/me', 'UsersController.me').middleware(['auth'])
  Route.patch('/me', 'UsersController.update').middleware(['auth'])
  Route.get('/me/conversations', 'UsersController.myConversations').middleware(['auth'])
  Route.get('/me/communities', 'UsersController.myCommunities').middleware(['auth'])
  Route.get('/me/relationships', 'UsersController.myRelationships').middleware(['auth'])
  Route.delete('/me/relationships/:id', 'UsersController.deleteRelationship').middleware(['auth'])
  Route.put('/me/relationships/:id', 'UsersController.putRelationship').middleware(['auth'])
  Route.get('/find', 'UsersController.find').middleware(['auth'])
  Route.get('/:id', 'UsersController.get').middleware(['auth'])
}).prefix('/users')

Route.group(() => {
  Route.post('/', 'ConversationsController.create')
  Route.get('/:id', 'ConversationsController.get')
  Route.patch('/:id', 'ConversationsController.patch')
  Route.post('/:id/leave', 'ConversationsController.leave')
  Route.get('/:id/members', 'ConversationsController.getMembers')
  Route.put('/:id/members/:userID', 'ConversationsController.putMember')
  Route.delete('/:id/members/:userID', 'ConversationsController.removeMember')
})
  .prefix('/conversations')
  .middleware(['auth'])

Route.group(() => {
  Route.get('/:id', 'ChannelsController.get')
  Route.post('/:id/ack', 'ChannelsController.ack')
  Route.get('/:id/messages', 'ChannelsController.getMessages')
  Route.post('/:id/messages', 'ChannelsController.postMessage')
  Route.post('/:id/join', 'ChannelsController.join')
  Route.patch('/:id', 'ChannelsController.edit')
  Route.delete('/:id', 'ChannelsController.delete')
})
  .prefix('/channels')
  .middleware(['auth'])

Route.group(() => {
  Route.post('/', 'CommunitiesController.create')
  Route.get('/:id', 'CommunitiesController.get')
  Route.get('/:id/channels', 'CommunitiesController.getChannels')
  Route.post('/:id/channels', 'CommunitiesController.createChannel')
  Route.get('/:id/groups', 'CommunitiesController.getGroups')
  Route.post('/:id/groups', 'CommunitiesController.createGroup')
})
  .prefix('/communities')
  .middleware(['auth'])

Route.group(() => {
  Route.get('/:id', 'MessagesController.get')
})
  .prefix('/messages')
  .middleware(['auth'])

Route.group(() => {
  Route.post('/started/:id', 'VoicesController.started')
  Route.put('/:id/users/:userID', 'VoicesController.join')
  Route.delete('/:id/users/:userID', 'VoicesController.leave')
}).prefix('/voice')
