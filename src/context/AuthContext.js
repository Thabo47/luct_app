import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../backend/firebase/config';

const AuthContext = createContext(null);

function buildProfileFromAuth(user, overrides = {}) {
  const email = user?.email?.trim().toLowerCase() || '';
  const fallbackName = user?.displayName?.trim() || email.split('@')[0] || 'User';

  return {
    name: fallbackName,
    email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const pendingProfileRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function syncProfile(firebaseUser) {
      if (!active) return;

      setLoading(true);
      setAuthError(null);

      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      try {
        const profileRef = doc(db, 'users', firebaseUser.uid);
        const snapshot = await getDoc(profileRef);

        if (snapshot.exists()) {
          const data = snapshot.data();
          setProfile({ id: snapshot.id, ...data });
          setLoading(false);
          return;
        }

        const pendingProfile = pendingProfileRef.current?.uid === firebaseUser.uid
          ? pendingProfileRef.current.profile
          : null;

        if (!pendingProfile) {
          setProfile(null);
          setAuthError('No user profile was found in Firestore. Please ask an administrator to create your role profile.');
          setLoading(false);
          return;
        }

        const nextProfile = buildProfileFromAuth(firebaseUser, pendingProfile);

        await setDoc(profileRef, nextProfile, { merge: true });

        const refreshedSnapshot = await getDoc(profileRef);

        if (!refreshedSnapshot.exists()) {
          throw new Error('Profile setup did not complete in Firestore.');
        }

        setProfile({ id: refreshedSnapshot.id, ...refreshedSnapshot.data() });
        pendingProfileRef.current = null;
      } catch (error) {
        setProfile(null);
        setAuthError(error.message || 'Failed to load user profile.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      syncProfile(firebaseUser);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function login(email, password) {
    setAuthError(null);
    await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  }

  async function register({
    email,
    password,
    name,
    role,
    facultyId = null,
    facultyName = null,
    courseId = null,
    courseName = null,
    courseCode = null,
  }) {
    setAuthError(null);
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    let credential;

    try {
      credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

      if (normalizedName) {
        await updateProfile(credential.user, { displayName: normalizedName });
      }

      pendingProfileRef.current = {
        uid: credential.user.uid,
        profile: {
          name: normalizedName,
          email: normalizedEmail,
          role,
          facultyId: facultyId || null,
          facultyName: facultyName || null,
          courseId: courseId || null,
          courseName: courseName || null,
          courseCode: courseCode || null,
          assignedCourseCodes: role === 'student' ? [] : null,
          assignedCourseNames: role === 'student' ? [] : null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      };

      await setDoc(doc(db, 'users', credential.user.uid), pendingProfileRef.current.profile, { merge: true });
    } catch (error) {
      pendingProfileRef.current = null;
      if (credential?.user) {
        try {
          await deleteUser(credential.user);
        } catch {}
      }
      throw error;
    }
  }

  async function logout() {
    setAuthError(null);
    await signOut(auth);
  }

  const value = useMemo(() => ({
    user,
    profile,
    role: profile?.role || null,
    loading,
    authError,
    login,
    register,
    logout,
  }), [user, profile, loading, authError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
