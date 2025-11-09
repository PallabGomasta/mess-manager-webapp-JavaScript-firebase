// dashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  deleteField
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// Firebase config
const firebaseConfig = {
//hoosh
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Elements
const userInfo = document.getElementById("userInfo");
const manageButton = document.getElementById("manageButton");
const modalOverlay = document.getElementById("modal-overlay");
const closeButton = document.querySelector(".close-button");

const memberSelect = document.getElementById("member-select");
const cashInput = document.getElementById("cash");
const expenseInput = document.getElementById("expense");
const mealInput = document.getElementById("meal");
const updateButton = document.querySelector(".update-button");

const tableContainer = document.querySelector(".table-container");
const summaryContainer = document.querySelector(".table-container2");  // Added this line

let globalMessId = null;

// Auth and redirect
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const uid = user.uid;
  const userRef = doc(db, "users", uid);
  

  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      userInfo.innerText = "User data not found.";
      return;
    }

    const userData = userSnap.data();
    const username = userData.username || userData.name || "Unknown User";
    const role = userData.role || "No Role";
    const messId = userData.messId || "No Mess ID";
    globalMessId = messId;

    userInfo.innerText = `Name: ${username} | Role: ${role} | Mess: ${messId}`;

    if (role.toLowerCase() === "manager") {
      manageButton.classList.remove("hidden");
      loadMembers(messId);
      loadHistory(messId); // Sudhu maneger dekhbe 
    } else {
      manageButton.classList.add("hidden");
    }

    // Always load the summary table regardless of role
    loadSummaryTable(globalMessId);

    manageButton.addEventListener("click", () => {
      modalOverlay.classList.remove("hidden");
    });

    closeButton.addEventListener("click", () => {
      modalOverlay.classList.add("hidden");
    });

    updateButton.addEventListener("click", async () => {
      const selectedMember = memberSelect.value.trim();
      if (selectedMember === "") {
        alert("Please select a member.");
        return;
      }

      const cashValue = cashInput.value.trim();
      const expenseValue = expenseInput.value.trim();
      const mealValue = mealInput.value.trim();

      const messRef = doc(db, "messes", globalMessId);
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

      try {
        // Get current mess data
        const messSnap = await getDoc(messRef);
        if (!messSnap.exists()) {
          alert("Mess data not found.");
          return;
        }
        const prevData = messSnap.data();

        // Prepare update object and history fields
        const updateData = {};
        const historyEntry = {
          member: selectedMember,
          date: dateStr,
          by: username,
          fields: {},
          timestamp: now.toISOString()
        };

        // Helper to parse float or 0
        const toNum = (val) => (val === "" ? 0 : parseFloat(val));

        // Compute new values by adding input to previous values
        if (cashValue !== "") {
          const field = `${globalMessId}_${selectedMember}_Cash`;
          const oldVal = prevData[field] || 0;
          const addedVal = toNum(cashValue);
          updateData[field] = oldVal + addedVal;
          historyEntry.fields[field] = { old: oldVal, new: updateData[field] };
        }

        if (expenseValue !== "") {
          const field = `${globalMessId}_${selectedMember}_Expense`;
          const oldVal = prevData[field] || 0;
          const addedVal = toNum(expenseValue);
          updateData[field] = oldVal + addedVal;
          historyEntry.fields[field] = { old: oldVal, new: updateData[field] };
        }

        if (mealValue !== "") {
          const field = `${globalMessId}_${selectedMember}_Meals`;
          const oldVal = prevData[field] || 0;
          const addedVal = toNum(mealValue);
          updateData[field] = oldVal + addedVal;
          historyEntry.fields[field] = { old: oldVal, new: updateData[field] };
        }

        if (Object.keys(updateData).length === 0) {
          alert("Please enter at least one field to update.");
          return;
        }

        // 1) Update member fields with summed values first
        await updateDoc(messRef, updateData);

        // 2) Recalculate mess totals by summing all member values
        const members = prevData.Members || {};
        let totalCash = 0, totalExpense = 0, totalMeals = 0;

        // Refetch updated data
        const updatedSnap = await getDoc(messRef);
        const updatedData = updatedSnap.data();

        Object.keys(members).forEach(uid => {
          const memberName = members[uid].name;

          totalCash += updatedData[`${globalMessId}_${memberName}_Cash`] || 0;
          totalExpense += updatedData[`${globalMessId}_${memberName}_Expense`] || 0;
          totalMeals += updatedData[`${globalMessId}_${memberName}_Meals`] || 0;
        });

        // Prepare mess total fields
        const messTotalUpdates = {};
        messTotalUpdates[`${globalMessId}_Cash`] = totalCash;
        messTotalUpdates[`${globalMessId}_Expense`] = totalExpense;
        messTotalUpdates[`${globalMessId}_Meals`] = totalMeals;

        // 3) Update mess total fields and append history
        await updateDoc(messRef, {
          ...messTotalUpdates,
          UpdateHistory: arrayUnion(historyEntry)
        });

        alert("Member data updated successfully!");

        // Clear inputs
        cashInput.value = "";
        expenseInput.value = "";
        mealInput.value = "";

        loadHistory(globalMessId);
        loadSummaryTable(globalMessId); // Refresh summary table after update

      } catch (error) {
        console.error("Error updating member data:", error);
        alert("Failed to update.");
      }
    });

  } catch (error) {
    console.error("Error loading user data:", error);
    userInfo.innerText = "Error loading user data.";
  }
});

// Load members
async function loadMembers(messId) {
  try {
    const messRef = doc(db, "messes", messId);
    const messSnap = await getDoc(messRef);
    if (!messSnap.exists()) return;

    const members = messSnap.data().Members;
    memberSelect.innerHTML = "";

    Object.keys(members).forEach(uid => {
      const memberName = members[uid].name;
      const option = document.createElement("option");
      option.value = memberName;
      option.textContent = memberName;
      memberSelect.appendChild(option);
    });

  } catch (error) {
    console.error("Error loading members:", error);
  }
}

// Load update history
async function loadHistory(messId) {
  const messRef = doc(db, "messes", messId);
  const messSnap = await getDoc(messRef);
  const data = messSnap.data();
  const history = data.UpdateHistory || [];

  const recent = history
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  const container = document.createElement("div");
  container.classList.add("update-history");

  // Update History title
  const title = document.createElement("h2");
  title.textContent = "Update History";
  container.appendChild(title);

  recent.forEach((entry, index) => {
    const div = document.createElement("div");
    div.classList.add("update-entry");

    // Compose single line summary of field updates like: Cash: 10→15, Expense: 5→7, Meal: 2→3
    const changes = Object.entries(entry.fields).map(([key, val]) => {
      const fieldName = key.split("_").pop(); // Cash, Expense, Meals
      return `${fieldName}: ${val.old} → ${val.new}`;
    }).join(", ");

    div.innerHTML = `
      <p><strong>${entry.by}</strong> updated <strong>${entry.member}</strong> on <strong>${entry.date}</strong>: ${changes}</p>
      <button data-index="${index}" class="delete-history" title="Delete this update">Delete</button>
    `;

    container.appendChild(div);
  });

  // Remove old container and append new
  const old = document.querySelector(".update-history");
  if (old) old.remove();
  tableContainer.appendChild(container);

  // Delete button listeners (keep your updated rollback logic here)
  document.querySelectorAll(".delete-history").forEach(btn => {
    btn.addEventListener("click", async () => {
      const idx = parseInt(btn.getAttribute("data-index"));
      const toDelete = recent[idx];

      try {
        const batch = writeBatch(db);
        const ref = doc(db, "messes", messId);

        // Rollback all updated fields to old values
        Object.entries(toDelete.fields).forEach(([field, val]) => {
          batch.update(ref, { [field]: val.old });
        });

        // Remove the history entry
        batch.update(ref, {
          UpdateHistory: arrayRemove(toDelete)
        });

        await batch.commit();

        // Recalculate totals after rollback
        const messSnap = await getDoc(ref);
        const data = messSnap.data();
        const members = data.Members || {};

        let totalCash = 0, totalExpense = 0, totalMeals = 0;
        Object.keys(members).forEach(uid => {
          const memberName = members[uid].name;

          totalCash += data[`${messId}_${memberName}_Cash`] || 0;
          totalExpense += data[`${messId}_${memberName}_Expense`] || 0;
          totalMeals += data[`${messId}_${memberName}_Meals`] || 0;
        });

        const totalsUpdate = {};
        totalsUpdate[`${messId}_Cash`] = totalCash;
        totalsUpdate[`${messId}_Expense`] = totalExpense;
        totalsUpdate[`${messId}_Meals`] = totalMeals;

        await updateDoc(ref, totalsUpdate);

        loadHistory(messId);
        loadSummaryTable(messId); // Refresh summary table after rollback
        alert("Update deleted and rolled back.");
      } catch (error) {
        console.error("Error deleting history:", error);
        alert("Failed to rollback update.");
      }
    });
  });
}

// shit table loader function (new)
async function loadSummaryTable(messId) {
  summaryContainer.innerHTML = ""; // Clear previous

  try {
    const messRef = doc(db, "messes", messId);
    const messSnap = await getDoc(messRef);
    if (!messSnap.exists()) {
      summaryContainer.innerHTML = "<p>Mess data not found.</p>";
      return;
    }
    const data = messSnap.data();
    const members = data.Members || {};

    const totalMeals = data[`${messId}_Meals`] || 0;
    const totalExpense = data[`${messId}_Expense`] || 0;
    const totalCash = data[`${messId}_Cash`] || 0;
    const mealRate = totalMeals > 0 ? (totalExpense / totalMeals) : 0;
    const messBalance = totalCash - totalExpense;

    const table = document.createElement("table");
    table.classList.add("summary-table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Name</th>
          <th>Meal</th>
          <th>Cash</th>
          <th>Expense</th>
          <th>Balance</th>
        </tr>
      </thead>
      <tbody></tbody>
      <tfoot>
        <tr class="summary-row">
          <td><strong>Totals</strong></td>
          <td><strong>${totalMeals.toFixed(2)}</strong></td>
          <td><strong>${totalCash.toFixed(2)}</strong></td>
          <td><strong>${totalExpense.toFixed(2)}</strong></td>
          <td><strong>${messBalance.toFixed(2)}</strong></td>
        </tr>
        <tr class="meal-rate-row">
          <td colspan="4" style="text-align:right;"><strong>Meal Rate:</strong></td>
          <td><strong>${mealRate.toFixed(2)}</strong></td>
        </tr>
      </tfoot>
    `;

    const tbody = table.querySelector("tbody");

    Object.keys(members).forEach(uid => {
      const memberName = members[uid].name;
      const meals = data[`${messId}_${memberName}_Meals`] || 0;
      const cash = data[`${messId}_${memberName}_Cash`] || 0;
      const expense = data[`${messId}_${memberName}_Expense`] || 0;
      const balance = cash - (meals * mealRate);

      const tr = document.createElement("tr");

 if (meals < 0 || cash < 0 || expense < 0 || balance < 0) {
    tr.style.backgroundColor = "rgba(255, 0, 0, 0.3)"; //conditional formating
  }

      tr.innerHTML = `
        <td>${memberName}</td>
        <td>${meals.toFixed(2)}</td>
        <td>${cash.toFixed(2)}</td>
        <td>${expense.toFixed(2)}</td>
        <td>${balance.toFixed(2)}</td>
      `;
      tbody.appendChild(tr);
    });

    summaryContainer.appendChild(table);

  } catch (error) {
    console.error("Error loading summary table:", error);
    summaryContainer.innerHTML = "<p>Error loading data.</p>";
  }
}
//..........

// Load status table
async function loadStatusTable(user, messId, role) {
  const messDocRef = doc(db, "messes", messId);
  const messSnap = await getDoc(messDocRef);
  const members = messSnap.data().Members;

  const tbody = document.querySelector("#status-table tbody");
  tbody.innerHTML = "";

  for (const [uid, memberInfo] of Object.entries(members)) {
    const row = document.createElement("tr");

    // Name column
    const nameCell = document.createElement("td");
    nameCell.textContent = memberInfo.name;
    row.appendChild(nameCell);

    // Note column
    const noteCell = document.createElement("td");
    const noteInput = document.createElement("input");
    noteInput.type = "text";
    noteInput.dataset.uid = uid;
    noteInput.classList.add("note-input");

    // Status column
    const statusCell = document.createElement("td");
    const statusSelect = document.createElement("select");
    statusSelect.dataset.uid = uid;
    statusSelect.classList.add("status-select");
    ["Due", "Paid"].forEach(optionText => {
      const option = document.createElement("option");
      option.value = optionText;
      option.textContent = optionText;
      statusSelect.appendChild(option);
    });

    // Load existing data if exists
    const memberDocRef = doc(db, "messes", messId);
    const memberData = messSnap.data()[uid];
    if (memberData) {
      if (memberData.note) noteInput.value = memberData.note;
      if (memberData.status) statusSelect.value = memberData.status;
    }

    noteCell.appendChild(noteInput);
    statusCell.appendChild(statusSelect);

    row.appendChild(noteCell);
    row.appendChild(statusCell);

    tbody.appendChild(row);
  }

  // Manager-only save button
  const saveButton = document.getElementById("save-status-table");
  saveButton.style.display = role === "manager" ? "block" : "none";
  saveButton.onclick = async () => {
    for (const [uid, memberInfo] of Object.entries(members)) {
      const note = document.querySelector(`.note-input[data-uid="${uid}"]`).value;
      const status = document.querySelector(`.status-select[data-uid="${uid}"]`).value;

      await updateDoc(doc(db, "messes", messId), {
        [`${uid}.note`]: note,
        [`${uid}.status`]: status
      });
    }
    alert("Status table updated.");
  };
}

//----------



// -------------------- MEMBER MANAGEMENT FEATURE --------------------
const openMessModalBtn = document.getElementById('openMessModal');
const closeModalBtn = document.getElementById('closeModal');
const messModal = document.getElementById('messModal');
const memberList = document.getElementById('memberList');
const logoutBtn = document.getElementById('logoutBtn');

openMessModalBtn.addEventListener('click', async () => {
  messModal.classList.remove('hidden');
  await populateMemberList();
});

closeModalBtn.addEventListener('click', () => {
  messModal.classList.add('hidden');
});

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});

async function populateMemberList() {
  memberList.innerHTML = ''; // clear previous list

  const user = auth.currentUser;
  if (!user) return;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) return;

  const { messId, role, username } = userDoc.data();
  const messRef = doc(db, 'messes', messId);
  const messSnap = await getDoc(messRef);
  if (!messSnap.exists()) return;

  const messData = messSnap.data();
  const members = messData.Members || {};

  for (const [uid, memberInfo] of Object.entries(members)) {
    const listItem = document.createElement('li');
    listItem.textContent = `${memberInfo.name} (${memberInfo.role})`;

    // Manager-only options
    if (role && role.toLowerCase().trim() === 'manager' && uid !== user.uid) {
      const makeManagerBtn = document.createElement('button');
      makeManagerBtn.textContent = 'Make Manager';
      makeManagerBtn.classList.add('mess-modal-button'); 
      makeManagerBtn.onclick = async () => {
        // Update roles
        const updates = {
          [`Members.${uid}.role`]: 'manager',
          [`Members.${user.uid}.role`]: 'member',
        };

        await updateDoc(messRef, updates);
        await updateDoc(doc(db, 'users', uid), { role: 'manager' });
        await updateDoc(doc(db, 'users', user.uid), { role: 'member' });

        alert('Manager role changed.');
        await populateMemberList();
      };
      listItem.appendChild(makeManagerBtn);

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.classList.add('mess-modal-button');
      removeBtn.onclick = async () => {
        const updates = {
          [`Members.${uid}`]: deleteField(),
          [`${messId}_${memberInfo.name}_Meals`]: deleteField(),
          [`${messId}_${memberInfo.name}_Cash`]: deleteField(),
          [`${messId}_${memberInfo.name}_Expense`]: deleteField()
        };
        await updateDoc(messRef, updates);
        await updateDoc(doc(db, 'users', uid), {
          role: deleteField(),
          messId: deleteField(),
          serial: deleteField()
        });
        alert('Member removed.');
        await populateMemberList();
      };
      listItem.appendChild(removeBtn);
    }

    // Leave button for self
    if (uid === user.uid) {
      const leaveBtn = document.createElement('button');
      leaveBtn.textContent = 'Leave';
      leaveBtn.classList.add('mess-modal-button');         // <-- And here
      leaveBtn.onclick = async () => {
        const updates = {
          [`Members.${uid}`]: deleteField(),
          [`${messId}_${username}_Meals`]: deleteField(),
          [`${messId}_${username}_Cash`]: deleteField(),
          [`${messId}_${username}_Expense`]: deleteField()
        };
        await updateDoc(messRef, updates);
        await updateDoc(doc(db, 'users', uid), {
          role: deleteField(),
          messId: deleteField(),
          serial: deleteField()
        });
        window.location.href = 'dhokbabana.html';
      };
      listItem.appendChild(leaveBtn);
    }

    memberList.appendChild(listItem);
  }
}

