import { useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const ACCEPTED_FILE_TYPES = ".txt,.md,.json,.csv,.pdf,.docx";

function App() {
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password123");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [status, setStatus] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const isAuthenticated = Boolean(token);
  const tokenPreview = token ? `${token.slice(0, 18)}...${token.slice(-12)}` : "";

  async function authorizedFetch(path, options = {}) {
    const headers = {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    };

    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    return response.json();
  }

  async function register() {
    setStatus("Registering user...");

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    setStatus(data.message || data.error);
  }

  async function login() {
    setStatus("Logging in...");

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.token) {
      setToken(data.token);
      setStatus("Login successful");
      const docs = await fetch(`${API_BASE_URL}/upload`, {
        headers: {
          Authorization: `Bearer ${data.token}`,
        },
      });
      const docsData = await docs.json();
      setDocuments(docsData.documents || []);
      return;
    }

    setStatus(data.error || "Login failed");
  }

  async function send() {
    if (!message.trim()) {
      return;
    }

    if (!token) {
      setStatus("Login first to send a message");
      return;
    }

    const userMessage = { role: "user", text: message };
    setChat(prev => [...prev, userMessage]);
    setStatus("Waiting for AI response...");

    const data = await authorizedFetch("/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    });

    setChat(prev => [
      ...prev,
      {
        role: "bot",
        text: data.answer || data.error,
        sources: data.sources || [],
        mode: data.mode || "unknown",
      },
    ]);
    setMessage("");
    setStatus("Response received");
  }

  async function uploadDocument() {
    if (!token) {
      setStatus("Login first to upload a document");
      return;
    }

    if (!selectedFile) {
      setStatus("Choose a file before uploading");
      return;
    }

    setStatus("Uploading document...");

    const formData = new FormData();
    formData.append("file", selectedFile);

    const data = await authorizedFetch("/upload", {
      method: "POST",
      body: formData,
    });

    if (data.document) {
      setStatus(`${data.document.filename} queued for indexing`);
      const docsData = await authorizedFetch("/upload", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setDocuments(docsData.documents || []);
      return;
    }

    setStatus(data.error || "Upload failed");
  }

  function logout() {
    setToken("");
    setMessage("");
    setChat([]);
    setStatus("Logged out");
    setSelectedFile(null);
    setDocuments([]);
  }

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(token);
      setStatus("Token copied to clipboard");
    } catch {
      setStatus("Could not copy token");
    }
  }

  return (
    <main className="app-shell">
      <section className="card">
        <p className="eyebrow">AI RAG Chatbot</p>
        <h1>Full demo source</h1>
        <p className="subtle">
          {isAuthenticated
            ? "Upload a document and ask grounded questions against the indexed content."
            : "Register or log in to open the document upload and chat workspace. This demo also reflects the common path from an LLM API prototype to RAG limits, retrieval bottlenecks, and eventually multi-agent orchestration needs that many teams were never staffed to own."}
        </p>

        {isAuthenticated ? (
          <>
            <div className="session-bar">
              <span>Signed in as {email}</span>
              <button onClick={logout}>Logout</button>
            </div>
            <div className="token-panel">
              <div className="token-copy">
                <strong>Debug Token</strong>
                <code>{tokenPreview}</code>
              </div>
              <button onClick={copyToken}>Copy Token</button>
            </div>
          </>
        ) : (
          <>
            <div className="grid">
              <input
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="Email"
              />
              <input
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="Password"
                type="password"
              />
            </div>

            <div className="actions">
              <button onClick={register}>Register</button>
              <button onClick={login}>Login</button>
            </div>
          </>
        )}

        <p className="status">{status}</p>

        {isAuthenticated ? (
          <>
            <div className="uploader">
              <label className="file-picker">
                <span>Select document</span>
                <input
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  onChange={event => {
                    const file = event.target.files?.[0] || null;
                    setSelectedFile(file);
                    setStatus(file ? `${file.name} ready to upload` : "No file selected");
                  }}
                />
              </label>
              <p className="helper">
                Supported uploads: `.txt`, `.md`, `.json`, `.csv`, `.pdf`, and `.docx`.
              </p>
              <div className="file-summary">
                {selectedFile ? (
                  <span>
                    {selectedFile.name} • {Math.max(1, Math.round(selectedFile.size / 1024))} KB
                  </span>
                ) : (
                  <span>No file selected</span>
                )}
              </div>
              <button onClick={uploadDocument}>
                {selectedFile ? `Upload ${selectedFile.name}` : "Upload Document"}
              </button>
            </div>

            <div className="documents">
              <h2>Indexed Documents</h2>
              {documents.length === 0 ? (
                <p className="empty">No uploaded documents yet.</p>
              ) : (
                documents.map(document => (
                  <div className="document-row" key={document.id}>
                    <strong>{document.filename}</strong>
                    <span>
                      {document.status} • {document.chunks} chunks • {Math.max(1, Math.round((document.originalLength || 0) / 1024))} KB text
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="chatbox">
              {chat.length === 0 ? (
                <p className="empty">No messages yet.</p>
              ) : (
                chat.map((entry, index) => (
                  <div className={`message ${entry.role}`} key={`${entry.role}-${index}`}>
                    <strong>{entry.role}</strong>
                    <span>{entry.text}</span>
                    {entry.sources?.length > 0 ? (
                      <small>
                        Sources: {entry.sources.map(source => source.filename).join(", ")}
                      </small>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <div className="composer">
              <input
                value={message}
                onChange={event => setMessage(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Enter") {
                    send();
                  }
                }}
                placeholder="Ask a question..."
              />
              <button onClick={send}>Send</button>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

export default App;
