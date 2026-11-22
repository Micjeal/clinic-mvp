import "server-only";

type LogFields = Record<string, string | number | boolean | undefined>;

function serializeError(error: unknown): LogFields {
  if (typeof error !== "object" || error === null) {
    return { errorType: typeof error };
  }
  const e = error as { name?: unknown; code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  const fields: LogFields = {};
  if (typeof e.name === "string") fields.errorName = e.name;
  if (typeof e.code === "string") fields.errorCode = e.code;
  if (typeof e.message === "string") fields.errorMessage = e.message.slice(0, 300);
  if (typeof e.details === "string" && e.details.length < 300) fields.errorDetails = e.details;
  if (typeof e.hint === "string" && e.hint.length < 300) fields.errorHint = e.hint;
  return fields;
}

export function logServerEvent(scope: string, event: string, fields: LogFields = {}) {
  console.info(JSON.stringify({ scope, event, ...fields }));
}

export function logServerError(scope: string, event: string, error: unknown, fields: LogFields = {}) {
  console.error(JSON.stringify({ scope, event, ...serializeError(error), ...fields }));
}
