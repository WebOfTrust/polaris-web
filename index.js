import { pubsub } from "./pubsub";

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
    }

    if (event.data.type && event.data.type === "signify-signature") {
      pubsub.publish("signify-signature", event.data.data);
    }
  },
  false
);

const requestAid = () => {
  window.postMessage({ type: "select-identifier" }, "*");
};

const requestCredential = () => {
  window.postMessage({ type: "select-credential" }, "*");
};

const requestAidORCred = () => {
  window.postMessage({ type: "select-aid-or-credential" }, "*");
};

const requestAutoSignin = async () => {
  const { data, error } = await chrome.runtime.sendMessage(extensionId, {
    type: "fetch-resource",
    subtype: "auto-signin-signature",
  });
  if (error) {
    window.postMessage({ type: "select-auto-signin" }, "*");
  } else {
    pubsub.publish("signify-signature", data);
  }
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
};
