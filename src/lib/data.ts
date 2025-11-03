import type { User, Group, Lead, Note, Collaborator } from './types';
import { PlaceHolderImages } from './placeholder-images';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { type Firestore } from 'firebase/firestore';

// Simulate a database with async functions
export const getLeads = async (db: Firestore, filters?: { assignedToId?: string; status?: string }): Promise<Lead[]> => {
  const leadsRef = collection(db, 'leads');
  let q = query(leadsRef);

  if (filters?.assignedToId) {
    q = query(q, where('assignedToId', '==', filters.assignedToId));
  }
  if (filters?.status && filters.status !== 'All') {
    q = query(q, where('status', '==', filters.status));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Lead));
};

export const getLeadById = async (db: Firestore, id: string): Promise<Lead | undefined> => {
    const docRef = doc(db, 'leads', id);
    const docSnap = await getDoc(docRef);
    if(docSnap.exists()){
      return { ...docSnap.data(), id: docSnap.id } as Lead
    }
}

export const getUsers = async (db: Firestore): Promise<Collaborator[]> => {
  const usersCol = collection(db, 'collaborators');
  const userSnapshot = await getDocs(usersCol);
  const userList = userSnapshot.docs.map(doc => doc.data() as Collaborator);
  return userList;
};

export const getUserById = async (db: Firestore, id: string): Promise<Collaborator | undefined> => {
    const docRef = doc(db, 'collaborators', id);
    const docSnap = await getDoc(docRef);
     if(docSnap.exists()){
      return docSnap.data() as Collaborator;
    }
}

export const getGroups = async (db: Firestore): Promise<Group[]> => {
  const groupsCol = collection(db, 'groups');
  const groupSnapshot = await getDocs(groupsCol);
  const groupList = groupSnapshot.docs.map(doc => ({...doc.data(), id: doc.id} as Group));
  return groupList;
}
