import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "firebase/auth";

import { doc, getDoc, setDoc } from "firebase/firestore";

import { auth, googleProvider, db } from "@/firebase";

const UserContext = createContext<any>(null);

export const UserProvider = ({ children }: any) => {

  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const unsub = onAuthStateChanged(auth, async (u) => {

      if (u) {

        setUser(u);

        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setRole(snap.data().role);
        }

      } else {

        setUser(null);
        setRole(null);

      }

      setLoading(false);

    });

    return () => unsub();

  }, []);

  const signUp = async (name: string, email: string, password: string) => {

    const res = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(res.user, { displayName: name });

    await setDoc(doc(db, "users", res.user.uid), {
      name,
      email,
      role: "user"
    });

  };

  const signIn = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password);

  const signInWithGoogle = () =>
    signInWithPopup(auth, googleProvider);

  const logout = () => signOut(auth);

  return (
    <UserContext.Provider
      value={{ user, role, loading, signUp, signIn, signInWithGoogle, logout }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);