let winstonModule = null;

try {
  winstonModule = await import("winston");
} catch {
  winstonModule = null;
}

function formatMeta(meta) {
  if (!meta.length) return {};
  if (meta.length === 1 && typeof meta[0] === "object" && meta[0] !== null) return meta[0];
  return { details: meta };
}

function createFallbackLogger() {
  return {
    debug(message, ...meta) {
      console.debug(JSON.stringify({ level: "debug", message, ...formatMeta(meta), timestamp: new Date().toISOString() }));
    },
    info(message, ...meta) {
      console.info(JSON.stringify({ level: "info", message, ...formatMeta(meta), timestamp: new Date().toISOString() }));
    },
    warn(message, ...meta) {
      console.warn(JSON.stringify({ level: "warn", message, ...formatMeta(meta), timestamp: new Date().toISOString() }));
    },
    error(message, ...meta) {
      console.error(JSON.stringify({ level: "error", message, ...formatMeta(meta), timestamp: new Date().toISOString() }));
    }
  };
}

function createWinstonLogger(winston) {
  const { combine, errors, json, timestamp } = winston.format;
  return winston.createLogger({
    level: process.env.LOG_LEVEL ?? "info",
    defaultMeta: {
      service: "kseip-backend"
    },
    format: combine(timestamp(), errors({ stack: true }), json()),
    transports: [new winston.transports.Console()]
  });
}

export const logger = winstonModule ? createWinstonLogger(winstonModule.default ?? winstonModule) : createFallbackLogger();
