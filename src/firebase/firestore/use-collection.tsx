'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * Gets a stable string representation of a Firestore query.
 * @param query The Firestore query.
 * @returns A string that uniquely identifies the query.
 */
function getQueryString(query: Query | CollectionReference): string {
    if (query.type === 'collection') {
        return (query as CollectionReference).path;
    }
    // Accessing internal but stable property to get a unique query identifier
    return (query as unknown as InternalQuery)._query.path.canonicalString() + JSON.stringify(query);
}


/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries robustly.
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. If null/undefined, it waits.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    targetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>))  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  // Store a string representation of the query to detect actual changes
  const queryMemo = targetRefOrQuery ? getQueryString(targetRefOrQuery) : null;
  
  useEffect(() => {
    // **THE ULTIMATE GUARD**
    // If there is no query, reset the state completely and stop.
    // This prevents any stale data or errors from persisting during re-renders
    // where the query is temporarily unavailable.
    if (!targetRefOrQuery) {
      setData(null);
      setError(null);
      setIsLoading(true); // Set to true because we are "waiting" for a valid query
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      targetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (snapshotError: FirestoreError) => {
        const path: string =
          targetRefOrQuery.type === 'collection'
            ? (targetRefOrQuery as CollectionReference).path
            : (targetRefOrQuery as unknown as InternalQuery)._query.path.toString()

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        })

        setError(contextualError)
        setData(null)
        setIsLoading(false)

        errorEmitter.emit('permission-error', contextualError);
      }
    );

    // This cleanup function will be called when the component unmounts
    // OR when the dependencies of the useEffect hook change (i.e., queryMemo).
    return () => unsubscribe();
  }, [queryMemo]); // The effect now ONLY re-runs if the query string itself changes.

  return { data, isLoading, error };
}
