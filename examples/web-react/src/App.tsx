import { AuthorizeResult, createClient, CreateCredentialResult, ExtensionClient } from "signify-polaris-web";
import { FormEvent, useEffect, useState } from "react";

export function App() {
  const [extensionId, setExtensionId] = useState<string | false | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authorizeResult, setAuthorizeResult] = useState<AuthorizeResult | null>(null);
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);
  const [pending, setPending] = useState(false);
  const [url, setUrl] = useState(window.location.href);
  const [method, setMethod] = useState("GET");
  const [dataDigest, setDataDigest] = useState('');
  const [digestAlgo, setDigestAlgo] = useState('SHA-256');
  const [attestCredResult, setAttestCredResult] = useState<CreateCredentialResult | null>(null);
  const [extensionClient, setExtensionClient] = useState<ExtensionClient | null>(null)

  useEffect(() => {
    const client = createClient();
    setExtensionClient(client)
    client.isExtensionInstalled().then((result) => setExtensionId(result));
  }, []);

  async function handleAuthorize(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    setAuthorizeResult(null);
    setPending(true);

    try {
      const result = await extensionClient.authorize({ message: `Message ${Date.now()}` });
      console.log('authorize result: ', result)
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
      const result = await extensionClient.signRequest({ url, method });
      console.log('signRequest result: ', result)
      setHeaders(result.headers);
    } catch (error) {
      setError(error.message ?? "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  async function handleAttestCredential(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    setPending(true);

    try {
      //// example of  data attestation schema: 
      ////  https://github.com/provenant-dev/public-schema/blob/main/attestation/attestation.schema.json
      let schemaSaid = 'ENDcMNUZjag27T_GTxiCmB2kYstg_kqipqz39906E_FD'
      let credData = { digest: dataDigest, digestAlgo: 'SHA-256' }
      const result = await extensionClient.createDataAttestationCredential({
        credData: credData,
        schemaSaid: schemaSaid
      });
      console.log('create data attestation credential result: ', result)
      setAttestCredResult(result);

    } catch (error) {
      setError(error.message ?? "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  async function handleDownloadCredential(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    setPending(true);


    try {
      let credSAID = attestCredResult?.acdc?._ked?.d
      const credential = await extensionClient.getCredential(credSAID, true);
      console.log('get credential result: ', credential)
      if (!credential?.credential) {
        setError("Unable to get credential");
        return
      }
      const blob = new Blob([credential.credential], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'attestation-credential.cesr';
      link.click();
      URL.revokeObjectURL(url);

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
            Request AID or Credential
          </button>
        </form>
      </section>
      <section>
        <h1>Request signed headers</h1>
        <form id="headers-form" onSubmit={handleSignHeaders}>
          <div>
            <label htmlFor="url">URL</label>
            <input id="url" value={url} onChange={(ev) => setUrl(ev.currentTarget.value)} style={{ marginLeft: '10px' }} />
          </div>
          <div style={{ marginTop: '10px' }}>
            <label htmlFor="method">Method</label>
            <input id="method" value={method} onChange={(ev) => setMethod(ev.currentTarget.value)} style={{ marginLeft: '10px' }} />
          </div>
          <div style={{ marginTop: '10px' }}>
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

      <section>
        <h1>Create Data Attestation Credential</h1>
        <form id="headers-form" onSubmit={handleAttestCredential}>
          <div>
            <label htmlFor="dataDigest">Data Digest</label>
            <input id="dataDigest" value={dataDigest} onChange={(ev) => setDataDigest(ev.currentTarget.value)} style={{ marginLeft: '10px' }} />
          </div>
          <div style={{ marginTop: '10px' }}>
            <label htmlFor="digestAlgo">Digest Algorithm</label>
            <input id="digestAlgo"
              value={digestAlgo}
              onChange={(ev) => setDigestAlgo(ev.currentTarget.value)}
              style={{ marginLeft: '10px' }}
              placeholder="e.g. SHA-256"
            />
          </div>
          <div style={{ marginTop: '10px' }}>
            <button type="submit" disabled={!authorizeResult || !dataDigest}>
              Attest with Selected AID
            </button>
            <button type="submit"
              disabled={!authorizeResult || !attestCredResult}
              style={{ marginLeft: '10px' }}
              onClick={handleDownloadCredential}>
              Download Attestation Credential
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
