import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "dingding",
  authDomain: "mess-management-baaler.firebaseapp.com",
  projectId: "mess-management-online",
  storageBucket: "mess-management-online.firebasestorage.app",
  messagingSenderId: "cherag",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const roleSelect = document.getElementById("roleSelect");
const messIdInput = document.getElementById("messIdInput");
const submitBtn = document.getElementById("submitBtn");

// Change button label on role change
roleSelect.addEventListener("change", () => {
  submitBtn.textContent = roleSelect.value === "manager" ? "Create" : "Join";
});

// Redirect if already in mess
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();

  if (userSnap.exists() && userData?.messId) {
    window.location.href = "dashboard.html";
  }
});

// Handle Join/Create
submitBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Please log in.");

  const uid = user.uid;
  const role = roleSelect.value.trim();
  const messId = messIdInput.value.trim();

  if (!role || !messId) return alert("Please select role and enter Mess ID.");

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return alert("User profile not found.");

  const username = userSnap.data().username || "UnknownUser";
  const email = user.email;

  const messRef = doc(db, "messes", messId);
  const messSnap = await getDoc(messRef);

  try {
    let serial;

    if (role === "manager") {
      if (messSnap.exists()) return alert("Mess ID already exists!");

      serial = 1;

      await setDoc(messRef, {
        [`${messId}_Meals`]: 0,
        [`${messId}_Cash`]: 0,
        [`${messId}_Expense`]: 0,
        Members: {
          [uid]: {
            name: username,
            role: role,
            serial: serial
          }
        },
        [`${messId}_${username}_Meals`]: 0,
        [`${messId}_${username}_Cash`]: 0,
        [`${messId}_${username}_Expense`]: 0
      });

    } else {
      if (!messSnap.exists()) return alert("Mess ID does not exist!");

      const members = messSnap.data().Members || {};
      const existingSerials = Object.values(members).map(m => m.serial || 0);
      serial = existingSerials.length > 0 ? Math.max(...existingSerials) + 1 : 1;

      await updateDoc(messRef, {
        [`Members.${uid}`]: {
          name: username,
          role: role,
          serial: serial
        },
        [`${messId}_${username}_Meals`]: 0,
        [`${messId}_${username}_Cash`]: 0,
        [`${messId}_${username}_Expense`]: 0
      });
    }

    // Update user doc with role, messId, serial, etc.
    await updateDoc(userRef, {
      username: username,
      email: email,
      role: role,
      messId: messId,
      uid: uid,
      serial: serial
    });

    alert(`Successfully ${role === "manager" ? "created" : "joined"} mess!`);
    window.location.href = "dashboard.html";

  } catch (err) {
    console.error("Error:", err);
    alert("Something went wrong: " + err.message);
  }
});
