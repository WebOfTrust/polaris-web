/** signature types */
export interface ICredential {
    issueeName: string;
    ancatc: string[];
    sad: {
        a: {
            i: string;
        };
        d: string;
    };
    schema: {
        title: string;
        credentialType: string;
        description: string;
    };
    status: {
        et: string;
    };
    cesr?: string;
}
/**
 * The ISignature interface represents a signature with signed headers and a credential (or an identifier).
 * @property {HeadersInit} headers - The signed headers.
 * @property {ICredential} credential - The credential.
 * @property {Identifier} identifier - The identifier.
 * @property {boolean} autoSignin - A flag indicating whether auto sign-in is enabled.
 */
export interface ISignature {
    headers: HeadersInit;
    credential?: ICredential;
    identifier?: {
        name?: string;
        prefix?: string;
    };
    autoSignin?: boolean;
}
/** signature types end */
/** pubsub types */
/** @internal */
export type Subscriber = {
    token: string;
    func: Function;
};
/** @internal */
export type EventMap = {
    [event: string]: Subscriber[];
};
/** pubsub types end */
