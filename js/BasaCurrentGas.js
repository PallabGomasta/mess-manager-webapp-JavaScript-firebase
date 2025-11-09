// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// Your Firebase config (replace with your own)
const firebaseConfig = {
 //I am not giving my api key. Why are you searching for it?
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Not logged in - redirect or show message
    alert("Please login first.");
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    alert("User data not found.");
    return;
  }
  const userData = userSnap.data();
  const messId = userData.messId;
  const role = userData.role || "member";

  if (!messId) {
    alert("You are not assigned to a mess.");
    return;
  }

  const messRef = doc(db, "messes", messId);
  const messSnap = await getDoc(messRef);
  if (!messSnap.exists()) {
    alert("Mess data not found.");
    return;
  }
  const messData = messSnap.data();
  const members = messData.Members || {};

  const tbody = document.querySelector("#status-table tbody");
  tbody.innerHTML = ""; // clear previous rows

  for (const [uid, memberInfo] of Object.entries(members)) {
    const username = memberInfo.name;
    const serial = memberInfo.serial || "N/A";

    // Keys for this member's fields
    const statusKey = `${messId}_${username}_Status`;
    const commentKey = `${messId}_${username}_Comment`;

    // Existing values or defaults
    const status = messData[statusKey] || "Due";
    const comment = messData[commentKey] || "";

    // Create row and cells
    const tr = document.createElement("tr");

    // Name cell
    const tdName = document.createElement("td");
    tdName.textContent = username;
    tr.appendChild(tdName);

    // Comment input cell
    const tdComment = document.createElement("td");
    const inputComment = document.createElement("input");
    inputComment.type = "text";
    inputComment.value = comment;
    inputComment.style.width = "100%";
    inputComment.disabled = (role !== "manager"); // only manager edits
    tdComment.appendChild(inputComment);
    tr.appendChild(tdComment);

    // Status select cell
    const tdStatus = document.createElement("td");
    const selectStatus = document.createElement("select");
    ["Due", "Paid"].forEach(optionVal => {
      const option = document.createElement("option");
      option.value = optionVal;
      option.textContent = optionVal;
      if (optionVal === status) option.selected = true;
      selectStatus.appendChild(option);
    });
    selectStatus.disabled = (role !== "manager"); // only manager edits
    tdStatus.appendChild(selectStatus);
    tr.appendChild(tdStatus);

    // Row color based on status
    if (status === "Due") {
      tr.style.backgroundColor = "#8d2d2dff"; // light red
    } else {
      tr.style.backgroundColor = "#226d22ff"; // light green
    }

    // If manager, update on input/change
    if (role === "manager") {
      inputComment.addEventListener("change", async () => {
        try {
          await updateDoc(messRef, {
            [commentKey]: inputComment.value
          });
          // Optionally, notify success
        } catch (e) {
          alert("Failed to update comment.");
          console.error(e);
        }
      });

      selectStatus.addEventListener("change", async () => {
        try {
          await updateDoc(messRef, {
            [statusKey]: selectStatus.value
          });
          // Change row color immediately
          if (selectStatus.value === "Due") {
            tr.style.backgroundColor = "#8d2d2dff"; // light red
          } else {
            tr.style.backgroundColor = "#226d22ff"; // light green
          }
        } catch (e) {
          alert("Failed to update status.");
          console.error(e);
        }
      });
    }

    tbody.appendChild(tr);
  }
});
