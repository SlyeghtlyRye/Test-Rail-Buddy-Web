import { createContext, useContext, useState } from "react";

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

  const logout = () => {
    sessionStorage.removeItem("testrail_credentials");
    setCredentials(null);
  };

  return (
    <AuthContext.Provider value={{ credentials, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}