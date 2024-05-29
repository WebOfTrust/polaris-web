/**
 * @internal
 */
export declare const pubsub: {
    publish: (event: string, data: any) => boolean;
    subscribe: (event: string, func: Function) => string;
    unsubscribe: (token: string) => string | null;
};
