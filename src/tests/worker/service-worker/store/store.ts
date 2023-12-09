try {
    await import("./delete");
    await import("./get");
    await import("./patch");
    await import("./post");
    await import("./put");
} catch (error) {
    console.error("Error creating store service worker", error);
    throw error
}

export {};