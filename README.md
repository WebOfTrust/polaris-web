# polaris-web


##  Usage

```typescript
import { createClient } from "signify-polaris-web";

const client = createClient();

async function handleLogin() {
    // This prompts the user to open the wallet and select a credential
    // promise is resolved with the CESR stream of the selected credential.
    const { cesr, sessionId } = await client.requestCredential();


    const response = await fetch("/verify", { body: cesr })
    if (!response.ok) {
        throw new Error("Not OK")
    }

    // Credential has been verified, so now the user can be considered "Logged in"

    const url = "/secret/resource";
    const method = "GET";
    const { headers } = await client.requestSignedHeaders({ url, method, sessionId })
    const request = new Request(url, { method, headers })

    // Resource server verifies the headers
    const secretResponse = await fetch(request)
}
```
