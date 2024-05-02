import { nanoid } from "nanoid";
import { pubsub } from "./pubsub";
import { canCallAsync } from "./utils";

var extensionId = "";

window.addEventListener(
  "message",
  async (event) => {
    // Accept messages only from same window
    if (event.source !== window) {
      return;
    }

    if (event.data.type && event.data.type === "signify-extension") {
      console.log("Content script loaded from polaris-web");
      extensionId = event.data.data.extensionId;
      pubsub.publish("signify-extension-loaded", extensionId);
    }

    if (
      event.data.type &&
      event.data.type === "signify-signature" &&
      event.data.requestId
    ) {
      pubsub.publish(event.data.requestId, event.data.data);
    }
  },
  false
);

const requestAid = () => {
  return new Promise((resolve) => {
    const requestId = nanoid();
    window.postMessage({ type: "select-identifier", requestId }, "*");
    pubsub.subscribe(requestId, (_event, data) => {
      resolve(data);
      pubsub.unsubscribe(requestId);
    });
  });
};

const requestCredential = () => {
  return new Promise((resolve) => {
    const requestId = nanoid();
    window.postMessage({ type: "select-credential", requestId }, "*");
    pubsub.subscribe(requestId, (_event, data) => {
      resolve(data);
      pubsub.unsubscribe(requestId);
    });
  });
};

const requestAidORCred = () => {
  return new Promise((resolve) => {
    const requestId = nanoid();
    window.postMessage({ type: "select-aid-or-credential", requestId }, "*");
    pubsub.subscribe(requestId, (_event, data) => {
      resolve(data);
      pubsub.unsubscribe(requestId);
    });
  });
};

const requestAutoSignin = async () => {
  return new Promise(async (resolve, reject) => {
    /**
     * In chrome or brave, chrome.runtime is accessible in webpages but in other browsers
     * like firefox chrome.runtime can only be accesed by content script.
     * canCallAsync() means sendMessage api can be used otherwise we postMessage to content script that
     * communicates with service-worker.
     */
    const requestId = nanoid();
    if (canCallAsync()) {
      const { data, error } = await chrome.runtime.sendMessage(extensionId, {
        type: "fetch-resource",
        subtype: "auto-signin-signature",
      });
      if (error) {
        window.postMessage({ type: "select-auto-signin", requestId }, "*");
        pubsub.subscribe(requestId, (_event, data) => {
          resolve(data);
          pubsub.unsubscribe(requestId);
        });
      } else {
        resolve(data);
      }
    } else {
      window.postMessage(
        {
          type: "fetch-resource",
          subtype: "auto-signin-signature",
          requestId,
        },
        "*"
      );
      pubsub.subscribe(requestId, (_event, data) => {
        resolve(data);
        pubsub.unsubscribe(requestId);
      });
    }
  });
};

const signifyFetch = async (url, req, fetchHeaders = false, aidName = "") => {
  if (fetchHeaders && aidName) {
    if (canCallAsync()) {
      const { data } = await chrome.runtime.sendMessage(extensionId, {
        type: "fetch-resource",
        subtype: "signify-headers",
        data: { aidName },
      });
      req.headers = { ...(req.headers ?? {}), ...(data ?? {}) };
    } else {
      req.headers = {
        ...(req.headers ?? {}),
        "x-append-signify-headers": "true",
        "x-aid-name": aidName,
      };
    }
  }
  return window.fetch(url, req);
};

const isExtensionInstalled = () => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false);
    }, 1000);
    pubsub.subscribe("signify-extension-loaded", (_event, extensionId) => {
      resolve(extensionId);
      clearTimeout(timeout);
      pubsub.unsubscribe("signify-extension-loaded");
    });
  });
};

const trySettingVendorUrl = async (vendorUrl) => {
  window.postMessage(
    {
      type: "vendor-info",
      subtype: "attempt-set-vendor-url",
      data: {
        vendorUrl,
      },
    },
    "*"
  );
};

const subscribeToSignature = (func) => {
  pubsub.subscribe("signify-signature", (_event, data) => func(data));
};

const unsubscribeFromSignature = () => {
  pubsub.unsubscribe("signify-signature");
};

export {
  requestAid,
  requestCredential,
  requestAidORCred,
  requestAutoSignin,
  subscribeToSignature,
  unsubscribeFromSignature,
  isExtensionInstalled,
  trySettingVendorUrl,
  canCallAsync,
  signifyFetch,
};
