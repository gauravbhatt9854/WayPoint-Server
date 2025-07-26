// clients.js
const clients = new Map();

export function addClient(socketId, { username, profileUrl }) {
  clients.set(socketId, { username, profileUrl, lat: 0, lng: 0 });
}

export function updateLocation(socketId, { lat, lng }) {
  const client = clients.get(socketId);
  if (client) {
    client.lat = lat;
    client.lng = lng;
  }
  console.log("client send his location " , client.username);
}

export function getClient(socketId) {
  return clients.get(socketId);
}

export function deleteClient(socketId) {
  clients.delete(socketId);
}

export function getAllClients() {
  return Array.from(clients.entries()).map(([id, data]) => ({ id, ...data }));
}

export function resetClients() {
  clients.clear();
}
