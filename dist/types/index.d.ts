import { ISignature } from "./types";
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
declare const requestAid: (rurl: string) => Promise<ISignature>;
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
declare const requestCredential: (rurl: string) => Promise<ISignature>;
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
declare const requestAidORCred: (rurl: string) => Promise<ISignature>;
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
declare const requestAutoSignin: (rurl: string) => Promise<ISignature>;
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
declare const signifyHeaders: (rurl: string, req: RequestInit, aidName?: string) => Promise<HeadersInit | undefined>;
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
declare const isExtensionInstalled: () => Promise<boolean | string>;
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
declare const trySettingVendorUrl: (vendorUrl: string) => Promise<void>;
export { requestAid, requestCredential, requestAidORCred, requestAutoSignin, isExtensionInstalled, trySettingVendorUrl, signifyHeaders, };
