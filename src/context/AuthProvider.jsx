// ======================================================================
//  AuthProvider.jsx — SAFE FOR VITE + REACT FAST REFRESH
// ======================================================================

import { createContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export const AuthContext = createContext({
  user: null,
  initializing: true,
});

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          setUser(data?.session?.user ?? null);
        }
      } catch (error) {
        console.error("Auth load error:", error);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!cancelled) {
          setUser(session?.user ?? null);
        }
      }
    );

    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing }}>
      {children}
    </AuthContext.Provider>
  );
}
