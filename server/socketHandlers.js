// socketHandlers.js
import {
  addClient,
  updateLocation,
  getClient,
  deleteClient,
  getAllClients,
  updateUsername
} from "./clients.js";

export function registerSocketHandlers(io) {
  
  io.on("connection", (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    // 🔔 Ask the client to send registration data
    socket.emit("requestRegistration");
    console.log(`📩 Requested registration from: ${socket.id}`);

    // 💾 Handle registration
    socket.on("register", ({ username, profileUrl, lat, lng }) => {
      addClient(socket.id, { username, profileUrl, lat, lng });
      
    });

    // 📍 Handle location updates
    socket.on("locationUpdate", ({ lat, lng }) => {
      if (!getClient(socket.id)) {
        console.warn(`⚠️ Location from unregistered user: ${socket.id}`);
        return;
      }
      updateLocation(socket.id, { lat, lng });
    });


    // update username
    socket.on("update-username", (username) => {
      console.log("Update name request : from " , socket.id , " and updated name : " , username);
      updateUsername(socket.id, username);
    })


    // 💬 Handle chat messages
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

    // ❌ Handle disconnection
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

  // 🔄 Broadcast all clients' locations periodically
  setInterval(() => {
    const locations = getAllClients();
    if (locations.length > 0) {
      io.emit("allLocations", locations);
      console.log("📡 Broadcasting registered clients:");
      locations.forEach((user) => console.log(user.username));
    }
  }, 10 * 1000);
}