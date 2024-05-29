"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signifyHeaders = exports.trySettingVendorUrl = exports.isExtensionInstalled = exports.requestAutoSignin = exports.requestAidORCred = exports.requestCredential = exports.requestAid = void 0;
const nanoid_1 = require("nanoid");
const pubsub_1 = require("./pubsub");
const utils_1 = require("./utils");
var extensionId = "";
window.addEventListener("message", (event) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // Accept messages only from same window
    if (event.source !== window) {
        return;
    }
    if (((_a = event.data) === null || _a === void 0 ? void 0 : _a.type) === "signify-extension") {
        console.log("Content script loaded from polaris-web");
        extensionId = event.data.data.extensionId;
        pubsub_1.pubsub.publish("signify-extension-loaded", extensionId);
    }
    if (((_b = event.data) === null || _b === void 0 ? void 0 : _b.type) === "signify-signature" && event.data.requestId) {
        pubsub_1.pubsub.publish(event.data.requestId, event.data.data);
    }
}), false);
/**
 * @category Signed Headers
 * @param {string} rurl resource url for which AID is requested
 * @returns {Promise<ISignature>} signature with signed headers and identifier
 * @summary Requests signature for the origin url.
 * The extension listening to this request will prompt the user to select an AID.
 * @example
 * ```ts
 * const signature = await requestAid("https://example.com/resource");
 * ```
 */
const requestAid = (rurl) => {
    return new Promise((resolve) => {
        const requestId = (0, nanoid_1.nanoid)();
        window.postMessage({ type: "select-identifier", requestId, rurl }, "*");
        pubsub_1.pubsub.subscribe(requestId, (_event, data) => {
            resolve(data);
            pubsub_1.pubsub.unsubscribe(requestId);
        });
    });
};
exports.requestAid = requestAid;
/**
 * @category Signed Headers
 * @param {string} rurl resource url for which credential is requested
 * @returns {Promise<ISignature>} signature with signed headers and credential
 * @summary Requests signature for the origin url.
 * The extension listening to this request will prompt the user to select a credential.
 * @example
 * ```ts
 * const signature = await requestCredential("https://example.com/resource");
 * ```
 */
const requestCredential = (rurl) => {
    return new Promise((resolve) => {
        const requestId = (0, nanoid_1.nanoid)();
        window.postMessage({ type: "select-credential", requestId, rurl }, "*");
        pubsub_1.pubsub.subscribe(requestId, (_event, data) => {
            resolve(data);
            pubsub_1.pubsub.unsubscribe(requestId);
        });
    });
};
exports.requestCredential = requestCredential;
/**
 * @category Signed Headers
 * @param {string} rurl resource url for which AID or credential is requested
 * @returns {Promise<ISignature>} signature with signed headers and credential (or identifier)
 * @summary Requests signature for the origin url.
 * The extension listening to this request will prompt the user to select an AID or Credential.
 * @example
 * ```ts
 * const signature = await requestAidORCred("https://example.com/resource");
 * ```
 *
 */
const requestAidORCred = (rurl) => {
    return new Promise((resolve) => {
        const requestId = (0, nanoid_1.nanoid)();
        window.postMessage({ type: "select-aid-or-credential", requestId, rurl }, "*");
        pubsub_1.pubsub.subscribe(requestId, (_event, data) => {
            resolve(data);
            pubsub_1.pubsub.unsubscribe(requestId);
        });
    });
};
exports.requestAidORCred = requestAidORCred;
/**
 * @category Signed Headers
 * @param {string} rurl resource url for which auto signin is requested
 * @returns {Promise<ISignature>} signature with signed headers and credential (or identifier)
 * @summary Requests auto signin signature for the origin url
 * @example
 * ```ts
 * const signature = await requestAutoSignin("https://example.com/resource");
 * ```
 * @remarks
 * Auto signin means the user has already created a signin pair for (the origin url + credential) and marked that as auto signin.
 */
const requestAutoSignin = (rurl) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => __awaiter(void 0, void 0, void 0, function* () {
        const requestId = (0, nanoid_1.nanoid)();
        if ((0, utils_1.canCallSendMessage)()) {
            const { data, error } = yield chrome.runtime.sendMessage(extensionId, {
                type: "fetch-resource",
                subtype: "auto-signin-signature",
                data: {
                    rurl,
                },
            });
            if (error) {
                if (error.code === 404) {
                    window.postMessage({ type: "select-auto-signin", requestId, rurl }, "*");
                    pubsub_1.pubsub.subscribe(requestId, (_event, data) => {
                        resolve(data);
                        pubsub_1.pubsub.unsubscribe(requestId);
                    });
                }
                else {
                    reject(error);
                }
            }
            else {
                resolve(data);
            }
        }
        else {
            window.postMessage({
                type: "fetch-resource",
                subtype: "auto-signin-signature",
                requestId,
                rurl,
            }, "*");
            pubsub_1.pubsub.subscribe(requestId, (_event, data) => {
                resolve(data);
                pubsub_1.pubsub.unsubscribe(requestId);
            });
        }
    }));
});
exports.requestAutoSignin = requestAutoSignin;
/**
 * @category Signed Headers
 * @param {string} rurl resource url for signed headers are requested
 * @param {RequestInit} req request headers
 * @param {string} aidName name associated with AID for which signed headers are requested
 * @returns {Promise<HeadersInit>} signed headers
 * @example
 * ```ts
 * const headers = await signifyHeaders(
      "https://example.com/resource",
      request,
      signin?.identifier?.name ?? signin.credential?.issueeName
    );
    return fetch(rurl, { ...request, headers });
 * ```
 * @summary Adds signed headers to the request headers, provided the aidName
 * @remarks
 * The extension will check if there exists a signin pair for the origin url and aidName that has autoSignin flag as true.
 * Headers are not signed otherwise.
 */
const signifyHeaders = (rurl_1, req_1, ...args_1) => __awaiter(void 0, [rurl_1, req_1, ...args_1], void 0, function* (rurl, req, aidName = "") {
    var _c, _d, _e;
    if (aidName) {
        if ((0, utils_1.canCallSendMessage)()) {
            const { data, error } = yield chrome.runtime.sendMessage(extensionId, {
                type: "fetch-resource",
                subtype: "signify-headers",
                data: { aidName, rurl, reqInit: req },
            });
            if (error && error.message) {
                throw new Error(error.message);
            }
            req.headers = Object.assign(Object.assign({}, ((_c = req.headers) !== null && _c !== void 0 ? _c : {})), ((_d = data.headers) !== null && _d !== void 0 ? _d : {}));
        }
        else {
            req.headers = Object.assign(Object.assign({}, ((_e = req.headers) !== null && _e !== void 0 ? _e : {})), { rurl, "x-aid-name": aidName });
        }
    }
    return req.headers;
});
exports.signifyHeaders = signifyHeaders;
/**
 * @category Config
 * @returns extensionId if extension is installed otherwise false
 * @summary Checks if signify extension is installed
 * @example
 * ```ts
 * const extensionId = await isExtensionInstalled();
 * setExtensionInstalled(Boolean(extensionId));
 * ```
 */
const isExtensionInstalled = () => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve(false);
        }, 1000);
        pubsub_1.pubsub.subscribe("signify-extension-loaded", (_event, extensionId) => {
            resolve(extensionId);
            clearTimeout(timeout);
            pubsub_1.pubsub.unsubscribe("signify-extension-loaded");
        });
    });
};
exports.isExtensionInstalled = isExtensionInstalled;
/**
 * @category Config
 * @param {string} vendorUrl vendor url to be set
 * @summary Tries to set the vendor url in the extension to load vendor supplied info e.g theme, logo etc.
 * @example
 * ```ts
 * await trySettingVendorUrl("https://api.npoint.io/52639f849bb31823a8c0");
 * ```
 * @remarks
 * This function is used to set the vendor url in the extension. The extension will fetch the vendor supplied info from the vendor url in json format.
 *
 * @see Template for [Vendor Loaded JSON](https://api.npoint.io/52639f849bb31823a8c0)
 */
const trySettingVendorUrl = (vendorUrl) => __awaiter(void 0, void 0, void 0, function* () {
    window.postMessage({
        type: "vendor-info",
        subtype: "attempt-set-vendor-url",
        data: {
            vendorUrl,
        },
    }, "*");
});
exports.trySettingVendorUrl = trySettingVendorUrl;
