export interface StoredMedia {
  body: ArrayBuffer;
  contentType: string;
}

/** Private object storage. Keys are always `<workspaceId>/<assetId>`. */
export interface MediaStorage {
  put(key: string, body: Blob | ArrayBuffer | string, contentType: string): Promise<void>;
  /** The object itself, or a short-lived URL to redirect the caller to. */
  read(key: string): Promise<StoredMedia | { redirect: string } | null>;
  remove(key: string): Promise<void>;
}
