'use client';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const { path, operation } = context;
    const message = `FirestoreError: Missing or insufficient permissions. The following request was denied by Firestore Security Rules:
{
  "operation": "${operation}",
  "path": "${path}"
}`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
    
    // This is to ensure the stack trace is captured correctly in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FirestorePermissionError);
    }
  }
}
