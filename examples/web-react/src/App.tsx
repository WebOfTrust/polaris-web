import { AuthorizeResult, createClient } from "signify-polaris-web";
import { FormEvent, useEffect, useState } from "react";

const client = createClient();

export function App() {
  const [extensionId, setExtensionId] = useState<string | false | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authorizeResult, setAuthorizeResult] = useState<AuthorizeResult | null>(null);
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);
  const [pending, setPending] = useState(false);
  const [url, setUrl] = useState(window.location.href);
  const [method, setMethod] = useState("GET");

  useEffect(() => {
    client.isExtensionInstalled().then((result) => setExtensionId(result));
  }, []);

  async function handleAuthorize(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    setAuthorizeResult(null);
    setPending(true);

    try {
      const result = await client.authorize({ message: `Message ${Date.now()}` });
      setAuthorizeResult(result);
    } catch (error) {
      setError(error.message ?? "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  async function handleSignHeaders(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    setPending(true);
    setHeaders(null);

    try {
      const result = await client.signRequest({ url, method });
      setHeaders(result.headers);
    } catch (error) {
      setError(error.message ?? "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "auto" }}>
      <section>
        <h1>Request login</h1>
        <form id="login-form" onSubmit={handleAuthorize}>
          <button type="submit" disabled={pending}>
            Request Credential
          </button>
        </form>
      </section>
      <section>
        <h1>Request signed headers</h1>
        <form id="headers-form" onSubmit={handleSignHeaders}>
          <div>
            <label htmlFor="url">URL</label>
            <input id="url" value={url} onChange={(ev) => setUrl(ev.currentTarget.value)} />
          </div>
          <div>
            <label htmlFor="method">Method</label>
            <input id="method" value={method} onChange={(ev) => setMethod(ev.currentTarget.value)} />
          </div>
          <div>
            <button type="submit" disabled={!authorizeResult}>
              Request Signed Headers
            </button>
          </div>
        </form>
      </section>
      <section>
        <h1>Current state</h1>
        <pre style={{ maxHeight: 400, overflowY: "scroll" }}>
          <code>
            {JSON.stringify(
              {
                isInstalled: extensionId,
                headers,
                error,
              },
              null,
              2,
            )}
          </code>
        </pre>
        <h1>Current credential</h1>
        <pre style={{ maxHeight: 400, overflowY: "scroll" }}>
          <code>
            {JSON.stringify(
              {
                credential: authorizeResult?.credential,
              },
              null,
              2,
            )}
          </code>
        </pre>
      </section>
    </div>
  );
}
