import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import AdminModal from "../components/AdminModal";
import Toast from "../components/Toast";

// ─────────────────────────────────────────────────────────────────────────────
// ManagementPage — hidden admin console at /management
// Never linked from the public-facing app.
// ─────────────────────────────────────────────────────────────────────────────
export default function ManagementPage() {
  const [session, setSession]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [loginError, setLoginError] = useState("");
  const [signingIn, setSigningIn]   = useState(false);
  const [toast, setToast]           = useState({ message: "", type: "success" });

  // ── Check existing session on mount ────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 3500);
  };

  // ── Sign in handler ─────────────────────────────────────────────────────────
  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoginError("");
    setSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Verify this user has the admin role in the profiles table
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      if (profileErr || profile?.role !== "admin") {
        await supabase.auth.signOut();
        throw new Error("Access denied. This account does not have admin privileges.");
      }
    } catch (err) {
      setLoginError(err.message || "Sign-in failed. Check your credentials.");
    } finally {
      setSigningIn(false);
    }
  };

  // ── Sign out ────────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mgmt-loading">
        <div className="mgmt-spinner" />
        <p>Checking authentication…</p>
      </div>
    );
  }

  // ── Not signed in — show login form ────────────────────────────────────────
  if (!session) {
    return (
      <div className="mgmt-login-root">
        <div className="mgmt-login-card">
          {/* Brand */}
          <div className="mgmt-login-brand">
            <img src="/image.png" alt="Voice of Art" className="mgmt-login-logo" />
            <h1 className="mgmt-login-title">Voice of Art</h1>
            <p className="mgmt-login-subtitle">Management Console</p>
          </div>

          <form className="mgmt-login-form" onSubmit={handleSignIn} noValidate>
            <div className="mgmt-field">
              <label htmlFor="mgmt-email">Email</label>
              <input
                id="mgmt-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@voiceofart.co.ke"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="mgmt-field">
              <label htmlFor="mgmt-password">Password</label>
              <input
                id="mgmt-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {loginError && (
              <div className="mgmt-login-error" role="alert">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="mgmt-login-btn"
              disabled={signingIn || !email || !password}
            >
              {signingIn ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          <p className="mgmt-login-note">
            🔒 This page is not linked from the public site.
          </p>
        </div>
      </div>
    );
  }

  // ── Signed in — show admin console ─────────────────────────────────────────
  return (
    <div className="mgmt-console-root">
      {/* Top bar */}
      <div className="mgmt-topbar">
        <div className="mgmt-topbar-brand">
          <img src="/image.png" alt="Voice of Art" className="mgmt-topbar-logo" />
          <span>Management Console</span>
        </div>
        <div className="mgmt-topbar-right">
          <span className="mgmt-topbar-email">{session.user.email}</span>
          <button className="mgmt-signout-btn" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Reuse the existing AdminModal content, but mounted inline */}
      <div className="mgmt-console-body">
        <AdminModal
          onClose={() => {}} // No close button in standalone page
          onToast={showToast}
          inlineMode={true}   // prop to hide the modal chrome (backdrop, close btn)
          supabaseSession={session}
        />
      </div>

      <Toast message={toast.message} type={toast.type} />
    </div>
  );
}
