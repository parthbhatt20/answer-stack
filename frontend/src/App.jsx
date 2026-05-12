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
  const [isSending, setIsSending] = useState(false);
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
    const outgoingMessage = message.trim();

    if (isSending) {
      setStatus("answer-stack is still retrieving the previous answer");
      return;
    }

    if (!outgoingMessage) {
      return;
    }

    if (!token) {
      setStatus("Login first to send a message");
      return;
    }

    const userMessage = { role: "user", text: outgoingMessage };
    setChat(prev => [...prev, userMessage]);
    setMessage("");
    setIsSending(true);
    setStatus("Waiting for AI response...");

    try {
      const data = await authorizedFetch("/chat", {
        method: "POST",
        body: JSON.stringify({ message: outgoingMessage }),
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
      setStatus("Response received");
    } catch (error) {
      setChat(prev => [
        ...prev,
        {
          role: "bot",
          text: error.message || "Could not retrieve an answer",
          sources: [],
          mode: "error",
        },
      ]);
      setStatus("Answer retrieval failed");
    } finally {
      setIsSending(false);
    }
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

  const indexedCount = documents.filter(document => document.status === "indexed").length;
  const totalChunks = documents.reduce((total, document) => total + Number(document.chunks || 0), 0);

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="brand-lockup">
          <span className="brand-mark">AS</span>
          <div>
            <p className="eyebrow">answer-stack</p>
            <h1>Ask your documents anything.</h1>
          </div>
        </div>
        <p className="subtle">
          {isAuthenticated
            ? "Your retrieval workspace is live. Upload files, stack context, and ask questions with grounded sources."
            : "A document Q&A playground with uploads, retrieval, source snippets, and a full-stack RAG flow behind the glass."}
        </p>

        <div className="signal-grid">
          <div className="signal-card hot">
            <span>Mode</span>
            <strong>{isAuthenticated ? "Workspace" : "Gateway"}</strong>
          </div>
          <div className="signal-card mint">
            <span>Documents</span>
            <strong>{documents.length}</strong>
          </div>
          <div className="signal-card violet">
            <span>Chunks</span>
            <strong>{totalChunks}</strong>
          </div>
        </div>

        {isAuthenticated ? (
          <>
            <div className="session-bar">
              <span>Signed in as <strong>{email}</strong></span>
              <button className="ghost-button" onClick={logout}>Logout</button>
            </div>
            <div className="token-panel">
              <div className="token-copy">
                <strong>Debug Token</strong>
                <code>{tokenPreview}</code>
              </div>
              <button className="mini-button" onClick={copyToken}>Copy</button>
            </div>
          </>
        ) : (
          <div className="auth-panel">
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
              <button className="ghost-button" onClick={register}>Register</button>
              <button onClick={login}>Login</button>
            </div>
          </div>
        )}

        <p className={`status ${status ? "is-visible" : ""}`}>{status || "System ready"}</p>

        {isAuthenticated ? (
          <div className="workspace-grid">
            <aside className="control-deck">
              <div className="panel-heading">
                <span className="panel-kicker">Context Lab</span>
                <h2>Stack files</h2>
              </div>
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
                <p className="helper">TXT, MD, JSON, CSV, PDF, and DOCX are welcome here.</p>
                <div className="file-summary">
                  {selectedFile ? (
                    <span>
                      {selectedFile.name} / {Math.max(1, Math.round(selectedFile.size / 1024))} KB
                    </span>
                  ) : (
                    <span>Drop a brainy file into the stack.</span>
                  )}
                </div>
                <button onClick={uploadDocument}>
                  {selectedFile ? "Index Document" : "Upload Document"}
                </button>
              </div>

              <div className="documents">
                <div className="panel-heading compact">
                  <span className="panel-kicker">{indexedCount} indexed</span>
                  <h2>Documents</h2>
                </div>
                {documents.length === 0 ? (
                  <p className="empty">No documents yet. Upload one and the chat gets smarter.</p>
                ) : (
                  documents.map(document => (
                    <div className="document-row" key={document.id}>
                      <strong>{document.filename}</strong>
                      <span>
                        {document.status} / {document.chunks} chunks / {Math.max(1, Math.round((document.originalLength || 0) / 1024))} KB text
                      </span>
                    </div>
                  ))
                )}
              </div>
            </aside>

            <section className="chat-stage">
              <div className="panel-heading">
                <span className="panel-kicker">Grounded Chat</span>
                <h2>Query console</h2>
              </div>
              <div className="chatbox">
                {chat.length === 0 ? (
                  <div className="empty-chat">
                    <strong>Ready for your first question.</strong>
                    <span>Try asking about a term, process, or decision inside an uploaded file.</span>
                  </div>
                ) : (
                  chat.map((entry, index) => (
                    <div className={`message ${entry.role}`} key={`${entry.role}-${index}`}>
                      <strong>{entry.role === "bot" ? "answer-stack" : "You"}</strong>
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
                    if (event.key === "Enter" && !isSending) {
                      send();
                    }
                  }}
                  disabled={isSending}
                  placeholder="Ask a question..."
                />
                <button
                  className={isSending ? "is-busy" : ""}
                  disabled={isSending || !message.trim()}
                  onClick={send}
                >
                  {isSending ? "Retrieving..." : "Send"}
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default App;
