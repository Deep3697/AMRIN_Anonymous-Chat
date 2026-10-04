/**
 * Singleton holder for the Socket.IO server instance.
 * Set once from index.js so REST controllers can emit events.
 */
let _io = null;

export function setIO(io) {
  _io = io;
}

export function getIO() {
  if (!_io) throw new Error("Socket.IO not initialised — call setIO(io) first");
  return _io;
}
