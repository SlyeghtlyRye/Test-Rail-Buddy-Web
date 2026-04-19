// ─────────────────────────────────────────────
//  AuthContext.jsx  —  Credentials + Demo mode
//  Drop this in: frontend/src/AuthContext.jsx
// ─────────────────────────────────────────────
import { createContext, useContext, useState } from "react";
import { DEMO_CREDENTIALS } from "./demoData";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [credentials, setCredentials] = useState(() => {
    const saved = sessionStorage.getItem("testrail_credentials");
    return saved ? JSON.parse(saved) : null;
  });

  const login = (url, email, password) => {
    const creds = { url, email, password };
    sessionStorage.setItem("testrail_credentials", JSON.stringify(creds));
    setCredentials(creds);
  };

  // Enters demo mode — no real credentials, no backend needed
  const loginDemo = () => {
    sessionStorage.setItem(
      "testrail_credentials",
      JSON.stringify(DEMO_CREDENTIALS)
    );
    setCredentials(DEMO_CREDENTIALS);
  };

  const logout = () => {
    sessionStorage.removeItem("testrail_credentials");
    setCredentials(null);
  };

  return (
    <AuthContext.Provider value={{ credentials, login, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}