import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { AttendanceTable, CoursePicker, Header, MonitorCard, RatingWidget } from '../../SharedComponents';
import { db } from '../../firebase';
import { useAuth } from '../context/AuthContext';
import { getCourseLabel, getModuleCode, getModuleLabel, moduleMatchesStudentCourse, normalizeModule } from '../utils/academicStructure';

const Tab = createBottomTabNavigator();

function getModuleIdentifier(item) {
  return getModuleCode(item);
}

function ScopeCard({ facultyName, courseName, moduleCount, selectedCourse }) {
  return (
    <View style={s.scopeCard}>
      <View style={s.scopeTop}>
        <View style={s.scopeHero}>
          <MaterialCommunityIcons name="account-school-outline" size={20} color="#bfdbfe" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.scopeLabel}>Faculty</Text>
          <Text style={s.scopeValue}>{facultyName || 'Not assigned'}</Text>
        </View>
      </View>
      <View style={s.statRow}>
        <View style={s.statCard}>
          <Text style={s.statValue}>{moduleCount}</Text>
          <Text style={s.statLabel}>Modules In Course</Text>
        </View>
      </View>
      <Text style={s.scopeCourseMeta}>Registered Course: {courseName || 'Not assigned'}</Text>
      <Text style={s.scopeCourseName}>
        {selectedCourse ? getModuleLabel(selectedCourse) : 'Choose one of your course modules below.'}
      </Text>
    </View>
  );
}

function StudentCoursePanel({
  facultyName,
  courseName,
  modules,
  selectedCourse,
  onSelectCourse,
  loading,
  scopeError,
}) {
  return (
    <>
      <ScopeCard
        facultyName={facultyName}
        courseName={courseName}
        moduleCount={modules.length}
        selectedCourse={selectedCourse}
      />
      {scopeError ? <Text style={s.error}>{scopeError}</Text> : null}
      {loading ? <ActivityIndicator color="#6366f1" style={{ marginBottom: 16 }} /> : null}
      <CoursePicker
        title="Course Modules"
        courses={modules}
        selectedCourseCode={getModuleIdentifier(selectedCourse)}
        onSelect={onSelectCourse}
        emptyText="No modules have been created under your course yet."
      />
    </>
  );
}

function StudentAttendancePanel({ user, profile, selectedCourse }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);

  const moduleCode = getModuleIdentifier(selectedCourse);
  const todayKey = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!user?.uid || !moduleCode) {
      setRecords([]);
      setLoading(false);
      return;
    }

    async function fetchAttendance() {
      setLoading(true);
      try {
        const attendanceQuery = query(
          collection(db, 'studentAttendance'),
          where('studentId', '==', user.uid),
          where('moduleCode', '==', moduleCode)
        );
        const snap = await getDocs(attendanceQuery);
        const nextRecords = snap.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setRecords(nextRecords);
      } catch (error) {
        setRecords([]);
      }
      setLoading(false);
    }

    fetchAttendance();
  }, [moduleCode, user?.uid]);

  async function signAttendance() {
    if (!user?.uid || !selectedCourse) {
      Alert.alert('Select module', 'Choose a module first.');
      return;
    }

    const alreadySigned = records.some((item) => item.dateKey === todayKey);
    if (alreadySigned) {
      Alert.alert('Attendance already signed', `You already signed attendance for ${todayKey}.`);
      return;
    }

    setSigning(true);
    try {
      await addDoc(collection(db, 'studentAttendance'), {
        studentId: user.uid,
        studentName: profile?.name || user.email || 'Student',
        facultyName: selectedCourse.facultyName || profile?.facultyName || null,
        courseName: selectedCourse.courseName || profile?.courseName || null,
        courseCode: selectedCourse.courseCode || profile?.courseCode || null,
        className: selectedCourse.className || selectedCourse.moduleName || null,
        moduleCode,
        status: 'present',
        dateKey: todayKey,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Attendance signed successfully.');
      setRecords((current) => ([
        {
          id: `local-${Date.now()}`,
          studentId: user.uid,
          studentName: profile?.name || user.email || 'Student',
          facultyName: selectedCourse.facultyName || profile?.facultyName || null,
          courseName: selectedCourse.courseName || profile?.courseName || null,
          courseCode: selectedCourse.courseCode || profile?.courseCode || null,
          className: selectedCourse.className || selectedCourse.moduleName || null,
          moduleCode,
          status: 'present',
          dateKey: todayKey,
          createdAt: { seconds: Math.floor(Date.now() / 1000) },
        },
        ...current,
      ]));
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to sign attendance.');
    }
    setSigning(false);
  }

  return (
    <View style={s.attendanceCard}>
      <Text style={s.availableTitle}>Student Attendance</Text>
      <Text style={s.attendanceText}>
        Module: {selectedCourse ? `${getModuleLabel(selectedCourse)} | ${getCourseLabel(selectedCourse)}` : 'Select a module first'}
      </Text>
      <TouchableOpacity style={s.signBtn} onPress={signAttendance} disabled={signing || !selectedCourse}>
        {signing ? <ActivityIndicator color="#fff" /> : <Text style={s.signBtnText}>Sign Attendance</Text>}
      </TouchableOpacity>
      {loading ? <ActivityIndicator color="#6366f1" style={{ marginTop: 12 }} /> : null}
      {records.slice(0, 4).map((item) => (
        <Text key={item.id} style={s.attendanceText}>
          {item.dateKey} - {item.status}
        </Text>
      ))}
      {!loading && !records.length ? <Text style={s.attendanceText}>No signed attendance yet for this module.</Text> : null}
    </View>
  );
}

function MonitoringTab(props) {
  const { facultyName, courseName, modules, selectedCourse, onSelectCourse, loadingCourses, scopeError } = props;

  return (
    <View style={s.screen}>
      <Header title="Monitoring" />
      <ScrollView contentContainerStyle={s.pad}>
        <StudentCoursePanel
          facultyName={facultyName}
          courseName={courseName}
          modules={modules}
          selectedCourse={selectedCourse}
          onSelectCourse={onSelectCourse}
          loading={loadingCourses}
          scopeError={scopeError}
        />
        {selectedCourse?.courseCode ? (
          <MonitorCard
            maxItems={20}
            courseCode={selectedCourse.courseCode}
            moduleCode={selectedCourse.moduleCode || null}
            title={`Monitoring: ${getModuleLabel(selectedCourse)}`}
            emptyText={`No monitoring reports found for ${getModuleLabel(selectedCourse)}.`}
          />
        ) : (
          <Text style={s.hint}>Select a module to view lecture monitoring.</Text>
        )}
      </ScrollView>
    </View>
  );
}

function RatingTab(props) {
  const { facultyName, courseName, modules, selectedCourse, onSelectCourse, loadingCourses, scopeError } = props;

  return (
    <View style={s.screen}>
      <Header title="Rating" />
      <ScrollView contentContainerStyle={s.pad}>
        <StudentCoursePanel
          facultyName={facultyName}
          courseName={courseName}
          modules={modules}
          selectedCourse={selectedCourse}
          onSelectCourse={onSelectCourse}
          loading={loadingCourses}
          scopeError={scopeError}
        />
        {selectedCourse?.courseCode ? (
          <RatingWidget
            targetId={selectedCourse.moduleCode || selectedCourse.courseCode}
            targetName={`${getModuleLabel(selectedCourse)} Lecture`}
            context="student-course-rating"
          />
        ) : (
          <Text style={s.hint}>Select a module to rate the lecture.</Text>
        )}
      </ScrollView>
    </View>
  );
}

function AttendanceTab(props) {
  const { user, profile, facultyName, courseName, modules, selectedCourse, onSelectCourse, loadingCourses, scopeError } = props;

  return (
    <View style={s.screen}>
      <Header title="Attendance" />
      <ScrollView contentContainerStyle={s.pad}>
        <StudentCoursePanel
          facultyName={facultyName}
          courseName={courseName}
          modules={modules}
          selectedCourse={selectedCourse}
          onSelectCourse={onSelectCourse}
          loading={loadingCourses}
          scopeError={scopeError}
        />
        {selectedCourse?.courseCode ? (
          <>
            <StudentAttendancePanel user={user} profile={profile} selectedCourse={selectedCourse} />
            <AttendanceTable courseCode={selectedCourse.courseCode} moduleCode={selectedCourse.moduleCode || null} />
          </>
        ) : (
          <Text style={s.hint}>Select a module to sign and review attendance.</Text>
        )}
      </ScrollView>
    </View>
  );
}

export default function StudentScreen() {
  const { profile, user } = useAuth();
  const [modules, setModules] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [scopeError, setScopeError] = useState(null);

  useEffect(() => {
    if (!profile?.facultyName) {
      setModules([]);
      setSelectedCourse(null);
      setScopeError('Your student profile is missing a faculty. Please update it from registration or admin setup.');
      setLoadingCourses(false);
      return;
    }
    if (!profile?.courseCode && !profile?.courseName) {
      setModules([]);
      setSelectedCourse(null);
      setScopeError('Your student profile is missing a course. Please register under a course first.');
      setLoadingCourses(false);
      return;
    }

    async function fetchCourses() {
      setLoadingCourses(true);
      try {
        const snap = await getDocs(collection(db, 'classes'));
        const facultyCourses = snap.docs
          .map((docItem) => normalizeModule({ id: docItem.id, ...docItem.data() }))
          .filter((item) => moduleMatchesStudentCourse(item, profile))
          .sort((a, b) => (a.courseCode || '').localeCompare(b.courseCode || ''));
        setModules(facultyCourses);
        setSelectedCourse((current) => {
          if (current?.id) {
            return facultyCourses.find((item) => item.id === current.id) || facultyCourses[0] || null;
          }
          return facultyCourses[0] || null;
        });

        if (!facultyCourses.length) {
          setScopeError('No modules have been created yet under your registered course.');
        } else {
          setScopeError(null);
        }
      } catch (error) {
        setModules([]);
        setSelectedCourse(null);
        setScopeError(error.message || 'Failed to load your faculty courses.');
      }
      setLoadingCourses(false);
    }

    fetchCourses();
  }, [profile?.courseCode, profile?.courseName, profile?.facultyName]);

  const sharedProps = {
    user,
    profile,
    facultyName: profile?.facultyName || null,
    courseName: profile?.courseName || profile?.courseCode || null,
    modules,
    selectedCourse,
    onSelectCourse: setSelectedCourse,
    loadingCourses,
    scopeError,
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Monitoring: focused ? 'chart-line' : 'chart-line-variant',
            Rating: focused ? 'star' : 'star-outline',
            Attendance: focused ? 'clipboard-check' : 'clipboard-check-outline',
          };
          return <MaterialCommunityIcons name={icons[route.name] || 'circle-outline'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Monitoring">{() => <MonitoringTab {...sharedProps} />}</Tab.Screen>
      <Tab.Screen name="Rating">{() => <RatingTab {...sharedProps} />}</Tab.Screen>
      <Tab.Screen name="Attendance">{() => <AttendanceTab {...sharedProps} />}</Tab.Screen>
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f172a' },
  pad: { padding: 16 },
  hint: { color: '#94a3b8', fontSize: 13, marginTop: 8 },
  error: { color: '#fca5a5', fontSize: 13, marginBottom: 16 },
  scopeCard: {
    backgroundColor: '#111827',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  scopeTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  scopeHero: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  scopeLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  scopeValue: { color: '#f8fafc', fontSize: 16, fontWeight: '600', marginTop: 4 },
  scopeCourseMeta: { color: '#94a3b8', fontSize: 12, marginBottom: 6 },
  scopeCourseName: { color: '#cbd5e1', fontSize: 14, fontWeight: '600' },
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: '#0f172a', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#1f2937' },
  statValue: { color: '#f8fafc', fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  attendanceCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  attendanceText: { color: '#cbd5e1', fontSize: 13, marginTop: 8 },
  signBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  signBtnText: { color: '#fff', fontWeight: '700' },
});

const styles = StyleSheet.create({
  tabBar: { backgroundColor: '#111827', borderTopColor: '#1f2937', borderTopWidth: 1, height: 66, paddingBottom: 6, paddingTop: 6 },
});
