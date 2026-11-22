import "server-only";
export class AuthenticationError extends Error {constructor(message="Authentication required"){super(message);this.name="AuthenticationError";}}
export class AuthorizationError extends Error {constructor(message="You are not authorized for this operation"){super(message);this.name="AuthorizationError";}}
export class ValidationError extends Error {constructor(message:string){super(message);this.name="ValidationError";}}
export class PasswordChangeRequiredError extends AuthorizationError {constructor(){super("Password change required");this.name="PasswordChangeRequiredError";}}
export class NotFoundError extends Error {constructor(message="The requested record was not found"){super(message);this.name="NotFoundError";}}
export function safeServerMessage(error:unknown,fallback:string){return error instanceof AuthenticationError||error instanceof AuthorizationError||error instanceof ValidationError||error instanceof NotFoundError?error.message:fallback;}
