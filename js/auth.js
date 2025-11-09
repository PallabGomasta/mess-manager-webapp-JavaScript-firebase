import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
 //I am not giving my api key. 
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// EXPORT LOGOUT FUNCTION
export const logout = async () => {
  try {
    await signOut(auth);
    alert("Logged out successfully!");
    window.location.href = "login.html";
  } catch (error) {
    alert("Error logging out: " + error.message);
  }
};

// REGISTER
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("Username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: username,
        email: email,
        role: "",          // Will be updated after mess selection
        messId: "", 
           // Will be updated after mess selection
        serial: null,      // Will be assigned during join/create mess
   
      });

      alert("Registration successful!");
      window.location.href = "login.html"; // Continue to role/mess selection
    } catch (error) {
      alert("Error: " + error.message);
    }
  });
}

// LOGIN
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("Username").value.trim();
    const password = document.getElementById("password").value;

    try {
      const q = query(collection(db, "users"), where("username", "==", username));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("Username not found!");
        return;
      }

      const userData = querySnapshot.docs[0].data();
      const email = userData.email;

      await signInWithEmailAndPassword(auth, email, password);

      window.location.href = "dhokbabana.html";
    } catch (error) {
      alert("Login failed: " + error.message);
    }
  });
  await setDoc(doc(db, "users", uid), {
  name: nameInput.value,
});

}
