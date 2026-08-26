import config from './config';

export const firebaseLoginHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Firebase Google Login Test</title>
  <style>
    body { font-family: sans-serif; max-width: 480px; margin: 80px auto; padding: 0 16px; }
    button { padding: 10px 16px; font-size: 16px; cursor: pointer; }
    #status { margin-top: 16px; white-space: pre-wrap; word-break: break-all; }
  </style>
</head>
<body>
  <h1>Firebase Google Login Test</h1>
  <button id="google-login">Login with Google</button>
  <p id="status"></p>

  <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
    import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

    const firebaseConfig = {
      apiKey: ${JSON.stringify(config.firebase.web_api_key || '')},
      authDomain: ${JSON.stringify(config.firebase.web_auth_domain || '')},
      projectId: ${JSON.stringify(config.firebase.project_id || '')},
      storageBucket: ${JSON.stringify(config.firebase.web_storage_bucket || '')},
      messagingSenderId: ${JSON.stringify(config.firebase.web_messaging_sender_id || '')},
      appId: ${JSON.stringify(config.firebase.web_app_id || '')},
      measurementId: ${JSON.stringify(config.firebase.web_measurement_id || '')}
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const statusEl = document.getElementById("status");

    document.getElementById("google-login").addEventListener("click", async () => {
      statusEl.textContent = "Signing in...";
      try {
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        const idToken = await result.user.getIdToken();

        console.log("Firebase ID token:", idToken);
        statusEl.textContent = "Got token. Sending to backend...\\n" + idToken;

        const res = await fetch("/api/v1/auth/login-with-firebase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ idToken }),
        });

        const data = await res.json();
        console.log("Backend response:", data);
        statusEl.textContent = res.ok
          ? "Login success.\\n" + JSON.stringify(data, null, 2)
          : "Login failed.\\n" + JSON.stringify(data, null, 2);
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Error: " + (err && err.message ? err.message : err);
      }
    });
  </script>
</body>
</html>
`;
