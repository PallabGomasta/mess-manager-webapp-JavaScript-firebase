import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

//  Firebase config 


const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// 📄 PDF Download Handler
document.getElementById("download-summary").addEventListener("click", async () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return alert("User not logged in.");

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return alert("User data not found.");

      const { messId, username } = userSnap.data();

      const messRef = doc(db, "messes", messId);
      const messSnap = await getDoc(messRef);
      if (!messSnap.exists()) return alert("Mess data not found.");

      const messData = messSnap.data();
      const members = messData.Members || {};

      const totalMeals = messData[`${messId}_Meals`] || 0;
      const totalCash = messData[`${messId}_Cash`] || 0;
      const totalExpense = messData[`${messId}_Expense`] || 0;
      const mealRate = totalMeals ? (totalExpense / totalMeals).toFixed(2) : "0.00";

      const { jsPDF } = window.jspdf;
      const docPdf = new jsPDF();

      // Centered text helper
      const centerText = (text, y, size = 14, bold = false) => {
        docPdf.setFontSize(size);
        docPdf.setFont("helvetica", bold ? "bold" : "normal");
        const pageWidth = docPdf.internal.pageSize.getWidth();
        const textWidth = docPdf.getTextWidth(text);
        docPdf.text(text, (pageWidth - textWidth) / 2, y);
      };

      // --- HEADER ---
      centerText(`Mess ID: ${messId}`, 20, 18, true);
      centerText("Mess Summary Receipt", 30, 14);
      centerText(`Downloaded on: ${new Date().toLocaleString()}`, 40, 12);
      centerText(`Downloaded by: ${username}`, 48, 12);

      // --- TABLE SETUP ---
      const startX = 15;
      let startY = 60;
      const rowHeight = 10;

      const headers = ["Name", "Role", "Meals", "Cash", "Expense", "Balance"];
      const colWidths = [40, 30, 25, 25, 25, 25];

      // Draw header row
      docPdf.setFont("helvetica", "bold");
      headers.forEach((header, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        docPdf.rect(x, startY, colWidths[i], rowHeight);
        docPdf.text(header, x + 2, startY + 7);
      });

      // Member rows
      docPdf.setFont("helvetica", "normal");
      let rowIndex = 1;

      for (const [uid, member] of Object.entries(members)) {
        const rowY = startY + rowHeight * rowIndex;
        const name = member.name;
        const role = member.role;

        const meals = messData[`${messId}_${name}_Meals`] ?? 0;
        const cash = messData[`${messId}_${name}_Cash`] ?? 0;
        const expense = messData[`${messId}_${name}_Expense`] ?? 0;
        const balance = (cash - expense).toFixed(2);

        const rowData = [name, role, `${meals}`, `${cash}`, `${expense}`, `${balance}`];

        rowData.forEach((text, i) => {
          const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
          docPdf.rect(x, rowY, colWidths[i], rowHeight);
          docPdf.text(text, x + 2, rowY + 7);
        });

        rowIndex++;
      }

      // Total row
      const totalY = startY + rowHeight * rowIndex;
      const totalBalance = (totalCash - totalExpense).toFixed(2);
      const totalRow = ["TOTAL", "", `${totalMeals}`, `${totalCash}`, `${totalExpense}`, `${totalBalance}`];

      docPdf.setFont("helvetica", "bold");
      totalRow.forEach((text, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        docPdf.rect(x, totalY, colWidths[i], rowHeight);
        docPdf.text(text, x + 2, totalY + 7);
      });

      // --- MEAL RATE ---
      docPdf.setFont("helvetica", "normal");
      centerText(`Meal Rate: ${mealRate}`, totalY + 15, 12);

      // --- FOOTER ---
      centerText("Downloaded from Mess Management Online", 285, 10);

      // Save PDF
      docPdf.save(`${messId}_Summary.pdf`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("Error generating summary.");
    }
  });
});