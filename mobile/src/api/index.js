import api from './client';

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const communityAPI = {
  checkDomain: (domain) => api.get(`/communities/check-domain?domain=${domain}`),
  verifyInvite: (inviteCode) => api.post('/communities/verify-invite', { inviteCode }),
};

export const listingAPI = {
  getListings: (params) => api.get('/listings', { params }),
  getMyListings: () => api.get('/listings/my'),
  getListing: (id) => api.get(`/listings/${id}`),
  createListing: (data) => api.post('/listings', data),
  updateListing: (id, data) => api.patch(`/listings/${id}`, data),
  deleteListing: (id) => api.delete(`/listings/${id}`),
};

export const borrowAPI = {
  createRequest: (data) => api.post('/borrow-requests', data),
  getMyRequests: (role) => api.get('/borrow-requests/mine', { params: { role } }),
  getRequest: (id) => api.get(`/borrow-requests/${id}`),
  accept: (id) => api.patch(`/borrow-requests/${id}/accept`),
  reject: (id) => api.patch(`/borrow-requests/${id}/reject`),
  markReturned: (id) => api.patch(`/borrow-requests/${id}/return`),
  cancel: (id) => api.patch(`/borrow-requests/${id}/cancel`),
};

export const borrowPostAPI = {
  getBorrowPosts: (params) => api.get('/borrow-posts', { params }),
  getBorrowPost: (id) => api.get(`/borrow-posts/${id}`),
  createBorrowPost: (data) => api.post('/borrow-posts', data),
  fulfillBorrowPost: (id) => api.patch(`/borrow-posts/${id}/fulfill`),
  updateBorrowPost: (id, data) => api.patch(`/borrow-posts/${id}`, data),
  deleteBorrowPost: (id) => api.delete(`/borrow-posts/${id}`),
};

export const rideAPI = {
  getRides: (params) => api.get('/rides', { params }),
  getRide: (id) => api.get(`/rides/${id}`),
  createRide: (data) => api.post('/rides', data),
  updateRide: (id, data) => api.patch(`/rides/${id}`, data),
  deleteRide: (id) => api.delete(`/rides/${id}`),
  closeRide: (id) => api.patch(`/rides/${id}/close`),
  completeRide: (id) => api.patch(`/rides/${id}/complete`),
  startRide: (id) => api.patch(`/rides/${id}/start`),
  updateLocation: (id, currentLocationText) => api.patch(`/rides/${id}/location`, { currentLocationText }),
  requestSeat: (id, seatsRequested) => api.post(`/rides/${id}/request-seat`, { seatsRequested }),
  getRideRequests: (id) => api.get(`/rides/${id}/requests`),
  acceptRequest: (rideId, requestId) => api.patch(`/rides/${rideId}/requests/${requestId}/accept`),
  rejectRequest: (rideId, requestId) => api.patch(`/rides/${rideId}/requests/${requestId}/reject`),
  cancelBooking: (id) => api.patch(`/rides/${id}/cancel-booking`),
};

export const favorAPI = {
  getFavors: (params) => api.get('/favors', { params }),
  getFavor: (id) => api.get(`/favors/${id}`),
  createFavor: (data) => api.post('/favors', data),
  updateFavor: (id, data) => api.patch(`/favors/${id}`, data),
  deleteFavor: (id) => api.delete(`/favors/${id}`),
  accept: (id) => api.patch(`/favors/${id}/accept`),
  complete: (id, data) => api.patch(`/favors/${id}/complete`, data || {}),
  cancel: (id) => api.patch(`/favors/${id}/cancel`),
};

export const chatAPI = {
  getConversations: () => api.get('/conversations'),
  createConversation: (data) => api.post('/conversations', data),
  getMessages: (id, page) => api.get(`/conversations/${id}/messages`, { params: { page } }),
  sendMessage: (id, text) => api.post(`/conversations/${id}/messages`, { text }),
  sendImageMessage: (id, image, text = '') => api.post(`/conversations/${id}/messages`, { text, image }),
};

export const reviewAPI = {
  createReview: (data) => api.post('/reviews', data),
  editReview: (id, data) => api.patch(`/reviews/${id}`, data),
  getUserReviews: (userId) => api.get(`/reviews/user/${userId}`),
  getPendingReviews: () => api.get('/reviews/pending'),
};

export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const userAPI = {
  getUser: (id) => api.get(`/users/${id}`),
  updateMe: (data) => api.patch('/users/me', data),
  updatePushToken: (pushToken) => api.post('/users/push-token', { pushToken }),
  searchUsers: (q) => api.get('/users/search', { params: { q } }),
};
