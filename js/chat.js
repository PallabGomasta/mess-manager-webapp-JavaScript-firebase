// chat.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
//bello
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const closeBtn = document.getElementById("close-btn");

let messId = null;
let userName = null;

function addMessageToChatBox(name, text) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("chat-message");
  msgDiv.textContent = `${name}: ${text}`;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Fetch name and messId from 'users' collection
    const userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      userName = userData.username || user.email || "Anonymous";
      messId = userData.messId;
    } else {
      alert("User profile not found.");
      return;
    }

    // Start listening to chat
    const messDocRef = doc(db, "messes", messId);
    onSnapshot(messDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const chatArray = data[`${messId}_Chat`] || [];
        chatBox.innerHTML = "";
        chatArray.forEach(msg => {
          addMessageToChatBox(msg.name, msg.text);
        });
      }
    });

  } else {
    alert("Please log in first!");
  }
});

sendBtn.addEventListener("click", async () => {
  const text = messageInput.value.trim();
  if (!text || !messId || !userName) return;

  const messDocRef = doc(db, "messes", messId);
  const newMessage = {
    name: userName,
    text: text,
    timestamp: new Date().toISOString()
  };

  try {
    await updateDoc(messDocRef, {
      [`${messId}_Chat`]: arrayUnion(newMessage)
    });
    messageInput.value = "";
  } catch (err) {
    console.error("Error sending message:", err);
  }
});

closeBtn.addEventListener("click", () => {
  document.querySelector(".chat-container").style.display = "none";
});
