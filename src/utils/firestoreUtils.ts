// src/utils/firestoreUtils.ts
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '../firebase';

export const saveCommentsToFirestore = async (roomId: string, comments: any) => {
  await setDoc(doc(firestore, 'chatRooms', roomId), {
    comments,
    updatedAt: Date.now()
  });
};

export const loadCommentsFromFirestore = async (roomId: string) => {
  const docSnap = await getDoc(doc(firestore, 'chatRooms', roomId));
  return docSnap.exists() ? docSnap.data().comments : [];
};
