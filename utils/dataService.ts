import { db, auth } from './firebase';
import { doc, writeBatch, setDoc, getDocs, collection } from 'firebase/firestore';

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: any;
}

const handleFirestoreError = (error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null) => {
    if (error && error.message && error.message.includes('insufficient permissions')) {
        const user = auth?.currentUser;
        const errorInfo: FirestoreErrorInfo = {
            error: error.message,
            operationType,
            path,
            authInfo: user ? {
                userId: user.uid,
                email: user.email,
                emailVerified: user.emailVerified,
                isAnonymous: user.isAnonymous,
                providerInfo: user.providerData.map(p => ({
                    providerId: p.providerId,
                    displayName: p.displayName,
                    email: p.email
                }))
            } : 'Not Authenticated'
        };
        throw new Error(JSON.stringify(errorInfo));
    }
    throw error;
};

/**
 * Performs a batched write to Firestore to save multiple pieces of user data at once.
 */
export const batchWriteLocalData = async (userId: string, dataToMigrate: Record<string, any>) => {
    if (!db) throw new Error("Firestore is not initialized.");

    const batch = writeBatch(db);

    for (const key in dataToMigrate) {
        const value = dataToMigrate[key];
        if (value !== null && value !== undefined) {
            const docRef = doc(db, 'users', userId, 'appData', key);
            batch.set(docRef, { data: value });
        }
    }

    try {
        await batch.commit();
    } catch (error) {
        handleFirestoreError(error, 'write', `users/${userId}/appData/*`);
    }
};

/**
 * Saves a single piece of application state to its own document in Firestore.
 */
export const saveDocument = async (userId: string, docId: string, data: any) => {
    if (!db || !userId) return;
    try {
        const docRef = doc(db, 'users', userId, 'appData', docId);
        await setDoc(docRef, { data });
    } catch (error) {
        console.error(`Error saving document ${docId}:`, error);
        handleFirestoreError(error, 'update', `users/${userId}/appData/${docId}`);
    }
};

/**
 * Loads all application data for a given user from their 'appData' collection.
 */
export const loadAllData = async (userId: string): Promise<Record<string, any>> => {
    if (!db || !userId) return {};
    try {
        const appDataRef = collection(db, 'users', userId, 'appData');
        const querySnapshot = await getDocs(appDataRef);
        const allData: Record<string, any> = {};
        querySnapshot.forEach((doc) => {
            allData[doc.id] = doc.data().data;
        });
        return allData;
    } catch (error) {
        console.error("Error loading all user data:", error);
        handleFirestoreError(error, 'list', `users/${userId}/appData`);
        return {};
    }
};
