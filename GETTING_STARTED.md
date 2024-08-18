# Polaris-Web Guide

[Polaris-Web](https://github.com/WebOfTrust/polaris-web) is a companion JavaScript library for the [Signify-Browser-Extension](https://github.com/WebOfTrust/signify-browser-extension) that enables front-end applications to interact with the extension.

Primary uses of Polaris-Web includes:
1. **Request an AID**: The front-end application can request the browser extension for the information related to an [Autonomic identifier (AID)](https://trustoverip.github.io/tswg-keri-specification).
2. **Request an ACDC**: The front-end application can also request the browser extension for an [Authentic Chained Data Container (ACDC)](https://trustoverip.github.io/tswg-acdc-specification).
3. **Generate and Sign HTTP Headers**: The front-end application can use Polaris-Web to generate an HTTP header and request the browser extension to sign it using a key associated with an [Autonomic Identifier (AID)](https://trustoverip.github.io/tswg-keri-specification). The signed HTTP header can then be sent to a backend server for verification.

### Initializing an extension client

Polaris Web can be used in a front-end application by initializing an extension client that provides an interface to a Signify browser extension.
```
import { createClient } from "signify-polaris-web";

const client = createClient();
```

### Checking if the extension has been installed
For each browser session, the front-end application could check if the Signify browser extension has been installed properly with `isExtensionInstalled()`, which either returns the extension ID as a string if the extension has been installed or `false` if it has not.
```
const isInstalled = await client.isExtensionInstalled();
```

### Customizing the browser extension

The browser extension could be customized, including changing the URL of the KERIA agent to which the extension is conneted or modifying the logo and colors of the browser extension according to the art style of a specific vendor.

```
client.configureVendor({url: customizationURL});
```
Once this script is executed, the user will be prompted by their browser extension to confirm if they wish to change the extension's configuration.

For more information about customizing the browser extension, see [signify-browser-extension/GETTING_STARTED_VENDOR.md](https://github.com/WebOfTrust/signify-browser-extension/blob/main/GETTING_STARTED_VENDOR.md)

### Requesting authorization from the extension

ฺBefore a user could sign a message using the extension, the front-end application must request for an explicit authorization from the extension. There are three methods to get authorizations: `client.authorizeAid()`, `client.authorizeCred()`, and `client.authorize()`.

These functions send a message to the extension and notify the user to enter their passcode if they have not already done so. After entering the passcode, the extension will prompt the user to choose authorization from one of their AIDs or credentials. Note that if the extension becomes inactive for more than 5 minutes, the user will be required to reenter the passcode.

#### Authorization from an AID
Getting authorization from an AID could be achieved by `client.authorizeAid()` that prompts the user to choose one of the identifiers in their wallet.
```
const result = await client.authorizeAid();
```
This function returns the an identifier object for the AID, including its `"name"` (alias), `"prefix"`. `"salty"` contains the salt for generating the AID and its keys. The example output below omits `"salty"` for brevity.
```
{
  "identifier": {
    "name": "alias of the AID",
    "prefix": "EE47_NNFDv-vq0z_5ex7OTpaQf4gW7eEJlSoDFC0izhV",
    "salty": { ...
    }
  }
}
```

#### Authorization from a credential
Getting authorization from a credential could be achieved by `client.authorizeCred()` that prompts the user to choose one of the credentials in their wallet. Note that the user could only choose a credential issued to an AID that the user controls.
```
const result = await client.authorizeCred();
```
This function returns the a credentail object, including information of its credential schema `"schema"`, credential content `"sad"`, and the [CESR](https://trustoverip.github.io/tswg-cesr-specification/). The CESR stream is 

The example output below omits many fields of the credential object for brevity.
```
{
  "credential": {
    "raw": {
      "anc": { ...
      },
      "ancatc": [ ...
      ],
      "anchor": { ...
      },
      "atc": "-IABEMZBfsIgmODEsfyyr_1bXZulkDngd1w8TbikJo1wF56S0AAAAAAAAAAAAAAAAAAAAAAAEMZBfsIgmODEsfyyr_1bXZulkDngd1w8TbikJo1wF56S",
      "chains": [ ...
      ],
      "iss": { ...
      },
      "issatc": "-VAS-GAB0AAAAAAAAAAAAAAAAAAAAAACEBppXTH_9acGh2wPxdE3TjXpWxJKei7Ks_ihuD7vlQUB",
      "issueeName": "alias of AID",
      "pre": "ELhWwlb9x-_3Z3xHjOgfZFMczLp1znM4ssnqpRP_SC08",
      "sad": { ...
      },
      "schema": { ...
      },
      "status": { ...
      }
    },
    "cesr": "{\"v\":\"KERI10JSON0001b7_\",\"t\":\"icp\" ... }"
  }
}
```

#### Authorization from either an AID or a credential
To let the user choose to get authorization from either an AID or a credential, `client.authorize()` could be used. The prompt from this function will display both available AIDs and credentials.
```
const result = await client.authorize();
```

Depending on the user's choice, the result will be either an identifier object or a credential object.

### Signing a HTTP header

After getting authorization, the user could sign a HTTP header with their AID.

```
const result = await client.signRequest({ url: url, method: method });
header.value = result.headers;
```
`header.value` contains the signed HTTP header that could be sent to a backend application for verification.
```
{
  "signature": "indexed=\"?0\";signify=\"0BDmr4stbKbJPSv-wyd62a0QiUtbCMfXOstZasa9fJxaouusNB3B_zJqh3BNKcjJppb8EOIV4KEfCvyr0XcOB6sA\"",
  "signature-input": "signify=(\"@method\" \"@path\" \"signify-resource\" \"signify-timestamp\");created=1723989864;keyid=\"BHl2gjrNzRVDoBqpwVJKSbtdiOkhHu2nMVo1E1sCP6d5\";alg=\"ed25519\"",
  "signify-resource": "EE47_NNFDv-vq0z_5ex7OTpaQf4gW7eEJlSoDFC0izhV",
  "signify-timestamp": "2024-08-18T14:04:24.866000+00:00"
}
```