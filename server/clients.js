// clients.js
const clients = new Map();

export function addClient(socketId, { username, profileUrl, lat, lng }) {
  if (clients.has(socketId)) {
    console.log(`🔁 Updating existing client: ${username} (${socketId})`);
  } else {
    console.log(`🆕 Adding new client: ${username} (${socketId})`);
  }

  clients.set(socketId, { username, profileUrl, lat, lng });
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
