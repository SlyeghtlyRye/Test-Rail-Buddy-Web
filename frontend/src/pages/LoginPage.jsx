import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { verifyAuth, getProjects } from "../api";
import { useAuth } from "../AuthContext";

export default function LoginPage() {
  const [url, setUrl] = useState("https://phonecom.testrail.io");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const authRes = await verifyAuth({ url, email, password });
      if (!authRes.data.success) {
        setError("Authentication failed. Check your credentials.");
        setLoading(false);
        return;
      }

      login(url, email, password);
      navigate("/projects");
    } catch (err) {
      setError("Could not connect. Check your TestRail URL.");
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>TestRail Buddy</h1>
      <p style={styles.subtitle}>Connect to your TestRail instance</p>
      <form onSubmit={handleLogin} style={styles.form}>
        <input
          style={styles.input}
          type="text"
          placeholder="TestRail URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "Connecting..." : "Connect"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "sans-serif",
  },
  title: { color: "#f8fafc", fontSize: "2rem", marginBottom: "8px" },
  subtitle: { color: "#94a3b8", fontSize: "1rem", marginBottom: "32px" },
  form: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    maxWidth: "400px",
    gap: "12px",
  },
  input: {
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid #334155",
    backgroundColor: "#1e293b",
    color: "#f8fafc",
    fontSize: "1rem",
    outline: "none",
  },
  button: {
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#3b82f6",
    color: "white",
    fontSize: "1rem",
    cursor: "pointer",
    marginTop: "8px",
  },
  error: { color: "#f87171", fontSize: "0.9rem", margin: "0" },
};