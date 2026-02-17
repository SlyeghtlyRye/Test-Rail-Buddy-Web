import { useState } from "react";
import axios from "axios";

function App() {
  const [url, setUrl] = useState("https://phonecom.testrail.io");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const authRes = await axios.post("http://localhost:8000/api/auth/verify", {
        url, email, password,
      });

      if (!authRes.data.success) {
        setError("Authentication failed. Check your credentials.");
        setLoading(false);
        return;
      }

      const projectsRes = await axios.post("http://localhost:8000/api/projects/", {
        url, email, password,
      });

      setProjects(projectsRes.data);
      setLoggedIn(true);
    } catch (err) {
      setError("Could not connect. Check your TestRail URL.");
    }

    setLoading(false);
  };

  if (loggedIn) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>TestRail Buddy</h1>
        <h2 style={styles.subtitle}>Projects</h2>
        <div style={styles.projectList}>
          {projects.map((project) => (
            <div key={project.id} style={styles.projectCard}>
              <span style={styles.projectName}>{project.name}</span>
              <span style={styles.projectId}>ID: {project.id}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>TestRail Buddy</h1>
      <p style={styles.subtitle}>Connect to your TestRail instance</p>
      <form onSubmit={handleLogin} style={styles.form}>
        <input
          style={styles.input}
          type="text"
          placeholder="TestRail URL (e.g. https://company.testrail.com)"
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
  title: {
    color: "#f8fafc",
    fontSize: "2rem",
    marginBottom: "8px",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: "1rem",
    marginBottom: "32px",
  },
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
  error: {
    color: "#f87171",
    fontSize: "0.9rem",
    margin: "0",
  },
  projectList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "100%",
    maxWidth: "500px",
  },
  projectCard: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "16px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  projectName: {
    color: "#f8fafc",
    fontSize: "1rem",
  },
  projectId: {
    color: "#64748b",
    fontSize: "0.85rem",
  },
};

export default App;