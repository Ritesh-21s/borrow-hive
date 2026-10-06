/**
 * Singleton holder for the Socket.IO server instance.
 * Set once in server.js; used in pushNotification.js to emit real-time events.
 */
let _io = null;

const setIo = (io) => { _io = io; };
const getIo = () => _io;

module.exports = { setIo, getIo };
