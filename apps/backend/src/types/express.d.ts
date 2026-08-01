// Declaration merging: adjunta el userId (del access token verificado) a Request.
// Solo está presente tras pasar por requireAuth; en el resto de requests es undefined.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
