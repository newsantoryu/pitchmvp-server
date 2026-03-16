export const Logger = {
    log: (...args) => console.log("[PitchMVP]", ...args),
    warn: (...args) => console.warn("[PitchMVP]", ...args),
    error: (...args) => console.error("[PitchMVP]", ...args)
};

Logger.log("Pitch:", pitch)