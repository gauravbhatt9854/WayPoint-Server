// socketHandlers.js
import {
  addClient,
  updateLocation,
  getClient,
  deleteClient,
  getAllClients,
} from "./clients.js";

export function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    socket.on("register", ({ username, profileUrl , lat , lng }) => {
      addClient(socket.id, { username, profileUrl , lat , lng });
      console.log(`👤 Registered: ${username}`);
    });

    socket.on("locationUpdate", ({ lat, lng }) => {
      if (!getClient(socket.id)) {
        console.warn(`⚠️ Location from unregistered user: ${socket.id}`);
        return;
      }
      updateLocation(socket.id, { lat, lng });
    });

    socket.on("chatMessage", (message) => {
      const sender = getClient(socket.id);
      if (!sender) {
        console.warn(`⚠️ Chat from unregistered socket: ${socket.id}`);
        return;
      }

      const chatData = {
        id: socket.id,
        username: sender.username,
        profileUrl: sender.profileUrl,
        message,
        timestamp: new Date(),
      };

      socket.broadcast.emit("newChatMessage", chatData);
    });

    socket.on("disconnect", () => {
      const user = getClient(socket.id);
      if (user) {
        console.log(`❌ Disconnected: ${user.username}`);
      } else {
        console.log(`❌ Unregistered user disconnected: ${socket.id}`);
      }
      deleteClient(socket.id);
    });
  });

  // Periodic location broadcast
  setInterval(() => {
    const locations = getAllClients();
    io.emit("allLocations", locations);
    console.log("List of Registered Users:");
    locations.forEach((user) => console.log(user.username));
  }, 60*1000);
}
