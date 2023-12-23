export interface ResolveOptions {
    parentURL?: string;
}

export interface ResolveFn {
    (url: string, context: ResolveOptions): unknown
}

export function resolve(url: string, context: ResolveOptions, next: ResolveFn) {
    console.log({ resolve: url });
    return next(url, context);
    //
    // if (url.startsWith("node:") || url.startsWith("data:")) {
    //     return next(url, context);
    // }
    //
    //
    // try {
    //     return next(url, context);
    // } catch (error) {
    //     console.log("Loader error", error);
    //     return {
    //         shortCircuit: true,
    //         url
    //     }
    // }
}

export async function load(url: string, context: ResolveOptions, next: ResolveFn) {
 try {

     console.log({ load: url });

     return next(url, context);
 } catch (error) {
     console.log("Loader error", error);
     throw error;
 }
}