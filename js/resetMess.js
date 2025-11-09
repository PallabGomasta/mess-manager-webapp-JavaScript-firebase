// ✅ Initialize Firebase (Only once!)
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

// ✅ Your Firebase config



// ✅ Init App
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ✅ Main logic
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const uid = user.uid;
  const userDocRef = doc(db, "users", uid);
  const userSnap = await getDoc(userDocRef);
  if (!userSnap.exists()) return;

  const userData = userSnap.data();
  const role = userData.role?.toLowerCase();
  const currentMessId = userData.messId;

  // ✅ Only show section to manager
  const resetSection = document.getElementById("reset-mess-section");
  if (role === "manager" && resetSection) {
    resetSection.classList.remove("hidden");

    document.getElementById("resetMessBtn").addEventListener("click", async () => {
      const newMessId = document.getElementById("newMessIdInput").value.trim();
      if (!newMessId) return alert("Please enter a new Mess ID.");

      try {
        const currentMessRef = doc(db, "messes", currentMessId);
        const currentMessSnap = await getDoc(currentMessRef);
        if (!currentMessSnap.exists()) return alert("Current mess does not exist.");

        const currentMessData = currentMessSnap.data();
        const members = currentMessData.Members || {};

        const newMembers = {};
        let serial = 1;
        const newMessFields = {
          [`${newMessId}_Meals`]: 0,
          [`${newMessId}_Cash`]: 0,
          [`${newMessId}_Expense`]: 0,
          Members: {}
        };

        for (const memberUid in members) {
          const { name, role } = members[memberUid];

          // Update user document to new mess
          await updateDoc(doc(db, "users", memberUid), {
            messId: newMessId,
            serial: serial
          });

          // Add to new Members list
          newMembers[memberUid] = {
            name,
            role,
            serial
          };

          // Add reset member-specific fields
          newMessFields[`${
            newMessId
          }_${name}_Meals`] = 0;
          newMessFields[`${
            newMessId
          }_${name}_Cash`] = 0;
          newMessFields[`${
            newMessId
          }_${name}_Expense`] = 0;

          serial++;
        }

        // Add updated Members object
        newMessFields.Members = newMembers;

        // Create new mess document with all reset fields
        const newMessRef = doc(db, "messes", newMessId);
        await setDoc(newMessRef, newMessFields);

        alert(`✅ Mess reset successful. All members moved to: ${newMessId}`);
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert("❌ Something went wrong while resetting the mess.");
      }
    });
  }
});
