import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { moduleMatchesStudentCourse, normalizeModule, normalizeReport } from '../utils/academicStructure';

const mapDocs = (snapshot, mapper = (item) => item) =>
  snapshot.docs.map((item) => mapper({ id: item.id, ...item.data() }));

export async function getCollectionItems(path, mapper) {
  const snapshot = await getDocs(collection(db, path));
  return mapDocs(snapshot, mapper);
}

export async function getUsers() {
  return getCollectionItems('users');
}

export async function getUsersByRole(role) {
  const usersQuery = query(collection(db, 'users'), where('role', '==', role));
  const snapshot = await getDocs(usersQuery);
  return mapDocs(snapshot);
}

export async function getClasses() {
  return getCollectionItems('classes', normalizeModule);
}

export async function getClassesByLecturer(lecturerId) {
  const classesQuery = query(collection(db, 'classes'), where('lecturerId', '==', lecturerId));
  const snapshot = await getDocs(classesQuery);
  return mapDocs(snapshot, normalizeModule);
}

export async function getStudentModules(profile) {
  const classes = await getClasses();
  return classes.filter((item) => moduleMatchesStudentCourse(item, profile));
}

export async function createClass(payload) {
  const ref = await addDoc(collection(db, 'classes'), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function assignLecturerToClass(classId, lecturer) {
  await updateDoc(doc(db, 'classes', classId), {
    lecturerId: lecturer?.id || null,
    lecturerName: lecturer?.name || null,
    lecturerEmail: lecturer?.email || null,
    updatedAt: serverTimestamp(),
  });
}

export async function getReports() {
  return getCollectionItems('reports', normalizeReport);
}

export async function getReportsByField(field, value) {
  const reportsQuery = query(collection(db, 'reports'), where(field, '==', value));
  const snapshot = await getDocs(reportsQuery);
  return mapDocs(snapshot, normalizeReport);
}

export async function submitReport(payload) {
  const ref = await addDoc(collection(db, 'reports'), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function saveReportFeedback(reportId, feedback) {
  await updateDoc(doc(db, 'reports', reportId), {
    prlFeedback: feedback || '',
    prlReviewedAt: serverTimestamp(),
  });
}

export async function getCourseMeta(courseCode) {
  const snapshot = await getDoc(doc(db, 'courseMeta', courseCode.trim().toUpperCase()));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function saveCourseMeta(courseCode, payload) {
  await setDoc(doc(db, 'courseMeta', courseCode.trim().toUpperCase()), payload, { merge: true });
}

export async function getStudentAttendance(studentId, moduleCode) {
  const attendanceQuery = query(
    collection(db, 'studentAttendance'),
    where('studentId', '==', studentId),
    where('moduleCode', '==', moduleCode)
  );
  const snapshot = await getDocs(attendanceQuery);
  return mapDocs(snapshot).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

export async function getAttendanceByFacultyScope(facultyName, courseCode = null) {
  const attendance = await getCollectionItems('studentAttendance');
  return attendance
    .filter((item) => item.facultyName === facultyName)
    .filter((item) => (courseCode ? item.courseCode === courseCode : true));
}

export async function signStudentAttendance({ studentId, studentName, selectedCourse }) {
  const ref = await addDoc(collection(db, 'studentAttendance'), {
    studentId,
    studentName,
    facultyName: selectedCourse.facultyName || null,
    courseName: selectedCourse.courseName || null,
    courseCode: selectedCourse.courseCode || null,
    className: selectedCourse.className || selectedCourse.moduleName || null,
    moduleCode: selectedCourse.moduleCode || null,
    status: 'present',
    dateKey: new Date().toISOString().slice(0, 10),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getRatings() {
  return getCollectionItems('ratings');
}

export async function submitRating(payload) {
  const ref = await addDoc(collection(db, 'ratings'), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
