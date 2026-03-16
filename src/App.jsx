import { useEffect, useMemo, useState } from "react";

const API_BASE = "https://app.notedistill.com/api/v1";

function getStoredToken() {
  return localStorage.getItem("notedistill_token") || "";
}

function setStoredToken(token) {
  if (token) {
    localStorage.setItem("notedistill_token", token);
  } else {
    localStorage.removeItem("notedistill_token");
  }
}

export default function App() {
  const [email, setEmail] = useState("otro@notedistill.com");
  const [password, setPassword] = useState("abcdef");
  const [token, setToken] = useState("");
  const [me, setMe] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [title, setTitle] = useState("Resumen rápido");
  const [content, setContent] = useState(
    "NoteDistill permite pegar texto y obtener un resumen claro y útil mediante inteligencia artificial. La idea es ahorrar tiempo al usuario y facilitar la destilación de información importante."
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [urlInput, setUrlInput] = useState("https://example.com");

  const selectedDocument = useMemo(
    () => documents.find((doc) => doc.id === selectedId) || null,
    [documents, selectedId]
  );

  useEffect(() => {
    const saved = getStoredToken();
    if (saved) {
      setToken(saved);
    }
  }, []);

  useEffect(() => {
    setStoredToken(token);
    if (token) {
      loadMe(token);
      loadDocuments(token);
    } else {
      setMe(null);
      setDocuments([]);
      setSelectedId(null);
    }
  }, [token]);

  async function apiFetch(path, options = {}, currentToken = token) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (currentToken) {
      headers.Authorization = `Bearer ${currentToken}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const detail =
        typeof data === "object" && data?.detail
          ? data.detail
          : `Error ${response.status}`;
      throw new Error(detail);
    }

    return data;
  }

  async function loadMe(currentToken = token) {
    try {
      const data = await apiFetch("/me", {}, currentToken);
      setMe(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadDocuments(currentToken = token) {
    try {
      const data = await apiFetch("/documents", {}, currentToken);
      setDocuments(data);
      if (data.length > 0) {
        setSelectedId((prev) => prev ?? data[0].id);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await apiFetch(
        "/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
        ""
      );
      setToken(data.access_token);
      setMessage("Sesión iniciada correctamente.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickSummarize(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await apiFetch("/documents/quick-summarize", {
        method: "POST",
        body: JSON.stringify({ title, content }),
      });
      setMessage("Documento creado y resumido.");
      await loadDocuments();
      setSelectedId(data.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

async function handleUrlSummarize(e) {
  e.preventDefault();
  setLoading(true);
  setError("");
  setMessage("");

  let url = urlInput.trim();

  // Añadir https:// automáticamente si el usuario no lo puso
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  try {
    const data = await apiFetch("/documents/url-summarize", {
      method: "POST",
      body: JSON.stringify({ url }),
    });

    setMessage("URL resumida correctamente.");
    await loadDocuments();
    setSelectedId(data.id);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}

  async function handleResummarize(documentId) {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await apiFetch(`/documents/${documentId}/summarize`, {
        method: "POST",
      });
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === documentId ? data : doc))
      );
      setSelectedId(documentId);
      setMessage("Resumen regenerado.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setToken("");
    setMessage("Sesión cerrada.");
    setError("");
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <h1>NoteDistill</h1>
          <p>Interfaz mínima funcional para login, resumen rápido, URL y documentos.</p>
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <div className="layout">
        <section className="card">
          <h2>Acceso</h2>
          <form onSubmit={handleLogin} className="stack">
            <label>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>

            <label>
              Contraseña
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <div className="row">
              <button type="submit" disabled={loading}>
                {loading ? "Entrando..." : "Iniciar sesión"}
              </button>
              <button type="button" className="secondary" onClick={handleLogout}>
                Salir
              </button>
            </div>
          </form>

          <div className="meta-box">
            <strong>Usuario actual</strong>
            <div>{me ? me.email : "Sin sesión activa"}</div>
          </div>
        </section>

        <section className="card">
          <h2>Quick summarize</h2>
          <form onSubmit={handleQuickSummarize} className="stack">
            <label>
              Título
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>

            <label>
              Contenido
              <textarea
                rows="10"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </label>

            <button type="submit" disabled={!token || loading}>
              {loading ? "Procesando..." : "Crear y resumir"}
            </button>
          </form>
        </section>

        <section className="card">
          <h2>Resumir URL</h2>
          <form onSubmit={handleUrlSummarize} className="stack">
            <label>
              URL
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..."
              />
            </label>

            <button type="submit" disabled={!token || loading}>
              {loading ? "Procesando..." : "Extraer y resumir URL"}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="row between">
            <h2>Documentos</h2>
            <button
              type="button"
              className="secondary"
              onClick={() => loadDocuments()}
              disabled={!token || loading}
            >
              Recargar
            </button>
          </div>

          <div className="documents-layout">
            <div className="documents-list">
              {documents.length === 0 && (
                <div className="muted">No hay documentos todavía.</div>
              )}

              {documents.map((doc) => (
                <button
                  key={doc.id}
                  className={`doc-item ${selectedId === doc.id ? "active" : ""}`}
                  onClick={() => setSelectedId(doc.id)}
                >
                  <strong>{doc.title}</strong>
                  <span>{doc.summary || doc.content}</span>
                </button>
              ))}
            </div>

            <div className="document-detail">
              {selectedDocument ? (
                <>
                  <div className="row between">
                    <h3>{selectedDocument.title}</h3>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => handleResummarize(selectedDocument.id)}
                      disabled={loading}
                    >
                      Regenerar resumen
                    </button>
                  </div>

                  <p className="stamp">
                    Creado: {selectedDocument.created_at}
                    <br />
                    Actualizado: {selectedDocument.updated_at}
                  </p>

                  <h4>Contenido</h4>
                  <div className="panel">{selectedDocument.content}</div>

                  <h4>Resumen</h4>
                  <div className="panel summary">
                    {selectedDocument.summary || "Todavía no hay resumen."}
                  </div>
                </>
              ) : (
                <div className="muted">Selecciona un documento.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
