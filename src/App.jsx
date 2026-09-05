import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, signInAnonymously } from "firebase/auth";
import { auth } from "./firebase";
import CRMApp from "./CRMApp";

// Nothing in the CRM renders until Firebase confirms a signed-in user, so the data itself is
// never exposed to someone who merely has the link.
export default function App() {
  const [user, setUser] = useState(undefined); // undefined = still checking
  const [referralAuthReady, setReferralAuthReady] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // The referral portal is meant to be opened by a customer/referrer who has no staff account —
  // that's the whole point of the #ref= link. It must stay reachable even before Firebase has
  // confirmed (or denied) a login, so it's checked first and bypasses the staff auth gate below.
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const isReferralPortal = hash === "#referral" || /^#ref=/.test(hash);

  // Firestore's security rules require *some* signed-in user before any read/write is allowed —
  // that's what protects the data from being fetched by a stranger with no link at all. A
  // referrer has no staff account, so an anonymous sign-in stands in for a real login here: it
  // satisfies that rule without granting the referrer anything beyond what the (unguessable)
  // link itself already exposes.
  useEffect(() => {
    if (!isReferralPortal) return;
    let cancelled = false;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (cancelled) return;
      if (u) {
        setReferralAuthReady(true);
      } else {
        signInAnonymously(auth).catch((err) => {
          console.error("Anonymous sign-in failed:", err);
          setReferralAuthReady(true); // let the page render; the read/write itself will surface the error
        });
      }
    });
    return () => { cancelled = true; unsub(); };
  }, [isReferralPortal]);

  if (isReferralPortal) {
    if (!referralAuthReady) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          background: "#F7F5F0", color: "#6B7686", fontFamily: "'Inter', sans-serif", fontSize: 14 }}>
          Loading…
        </div>
      );
    }
    return <CRMApp />;
  }

  if (user === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#0B2A4A", color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 15 }}>
        Loading…
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "fixed", top: 10, right: 12, zIndex: 9999, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: "#6B7686", background: "#fff", padding: "3px 8px",
          borderRadius: 6, border: "1px solid #E2DDD0" }}>{user.email}</span>
        <button onClick={() => signOut(auth)}
          style={{ fontSize: 11, padding: "4px 10px", background: "#fff", border: "1px solid #E2DDD0",
            borderRadius: 6, cursor: "pointer", color: "#C24141", fontWeight: 600 }}>
          Sign Out
        </button>
      </div>
      <CRMApp />
    </div>
  );
}

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      // Deliberately vague — telling an outsider which half was wrong helps them guess.
      setError("Login failed. Please check your email and password.");
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%", padding: "11px 14px", border: "1px solid #E2DDD0", borderRadius: 9,
    fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'Inter', sans-serif",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0B2A4A 0%, #1a4a7a 100%)", padding: 20,
      fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 18, padding: "40px 36px", width: "100%",
        maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, background: "linear-gradient(135deg,#0B2A4A,#C89B3C)",
            borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
            <span style={{ color: "#fff", fontSize: 24 }}>☀</span>
          </div>
          <h1 style={{ fontSize: 21, fontWeight: 700, color: "#0B2A4A", marginTop: 12, marginBottom: 0 }}>
            Eternalgy Case Hub
          </h1>
          <p style={{ fontSize: 12, color: "#9AA2AD", marginTop: 4 }}>Staff access only</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7686",
              marginBottom: 6, letterSpacing: 0.5 }}>EMAIL</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com" required autoFocus style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7686",
              marginBottom: 6, letterSpacing: 0.5 }}>PASSWORD</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required style={inputStyle} />
          </div>

          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: 12, background: "#0B2A4A", color: "#fff", border: "none",
              borderRadius: 9, fontSize: 14, fontWeight: 600, marginTop: 8,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>

          {error && (
            <div style={{ background: "#FBEAEA", color: "#C24141", borderRadius: 8,
              padding: "10px 14px", fontSize: 13, marginTop: 14 }}>{error}</div>
          )}
        </form>

        <div style={{ fontSize: 11, color: "#B5AE9E", textAlign: "center", marginTop: 20 }}>
          Contact your administrator if you need an account.
        </div>
      </div>
    </div>
  );
}
