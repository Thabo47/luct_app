import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { doc, getDocs, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../backend/firebase/config';
import { CoursePicker, Header, MonitorCard, RatingWidget } from '../sharedComponents/SharedComponents';
import { useAuth } from '../context/AuthContext';
import { getCourseLabel, getModuleCode, getModuleLabel, normalizeModule, normalizeReport } from '../utils/academicStructure';

const Tab = createBottomTabNavigator();

function buildScope(profile) {
  if (!profile?.facultyName) {
    return {
      ready: false,
      error: 'Your PRL account needs a faculty and stream before it can manage reports.',
      facultyName: null,
      courseCode: null,
      courseName: null,
      title: 'PRL Scope Missing',
      matches: () => false,
    };
  }

  return {
    ready: true,
    error: null,
    facultyName: profile.facultyName,
    courseCode: profile.courseCode || null,
    courseName: profile.courseName || null,
    title: profile.courseCode ? `${profile.facultyName} | ${profile.courseCode}` : profile.facultyName,
    matches(item) {
      if (!item) {
        return false;
      }
      if (item.facultyName && item.facultyName !== profile.facultyName) {
        return false;
      }
      if (profile.courseCode) {
        return item.courseCode === profile.courseCode;
      }
      if (profile.courseName) {
        return item.courseName === profile.courseName;
      }
      return item.facultyName === profile.facultyName;
    },
  };
}

function ScopeBanner({ scope }) {
  return (
    <View style={s.scopeCard}>
      <Text style={s.scopeLabel}>PRL Scope</Text>
      <Text style={s.scopeValue}>{scope.ready ? scope.title : 'Unavailable'}</Text>
      <Text style={s.scopeHint}>PRL works inside one faculty stream and reviews modules, reports, attendance, and lecture activity there.</Text>
      {scope.error ? <Text style={s.scopeError}>{scope.error}</Text> : null}
    </View>
  );
}

function SummaryStrip({ classes = [], reports = [], students = [] }) {
  const reviewedCount = reports.filter((item) => item?.prlFeedback).length;

  return (
    <View style={s.summaryRow}>
      <View style={s.summaryCard}>
        <Text style={s.summaryValue}>{classes.length}</Text>
        <Text style={s.summaryLabel}>Modules</Text>
      </View>
      <View style={s.summaryCard}>
        <Text style={s.summaryValue}>{reports.length}</Text>
        <Text style={s.summaryLabel}>Reports</Text>
      </View>
      <View style={s.summaryCard}>
        <Text style={s.summaryValue}>{students.length}</Text>
        <Text style={s.summaryLabel}>Students</Text>
      </View>
      <View style={s.summaryCard}>
        <Text style={s.summaryValue}>{reviewedCount}</Text>
        <Text style={s.summaryLabel}>Reviewed</Text>
      </View>
    </View>
  );
}

function CoursesTab({ scope }) {
  const [classes, setClasses] = useState([]);
  const [reports, setReports] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scope.ready) {
      setClasses([]);
      setReports([]);
      setStudents([]);
      setSelectedCourse(null);
      setLoading(false);
      return;
    }

    async function fetchData() {
      setLoading(true);
      try {
        const [classesSnap, reportsSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, 'classes')),
          getDocs(collection(db, 'reports')),
          getDocs(collection(db, 'users')),
        ]);

        const nextClasses = classesSnap.docs
          .map((item) => normalizeModule({ id: item.id, ...item.data() }))
          .filter((item) => scope.matches(item))
          .sort((a, b) => (a.courseCode || '').localeCompare(b.courseCode || ''));
        const nextReports = reportsSnap.docs
          .map((item) => normalizeReport({ id: item.id, ...item.data() }))
          .filter((item) => scope.matches(item));
        const nextStudents = usersSnap.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((item) => item.role === 'student' && item.facultyName === scope.facultyName)
          .filter((item) => {
            if (scope.courseCode) {
              return item.courseCode === scope.courseCode;
            }
            if (scope.courseName) {
              return item.courseName === scope.courseName;
            }
            return true;
          });

        setClasses(nextClasses);
        setReports(nextReports);
        setStudents(nextStudents);
        setSelectedCourse((current) => {
          if (current?.id) {
            return nextClasses.find((item) => item.id === current.id) || nextClasses[0] || null;
          }
          return nextClasses[0] || null;
        });
      } catch (error) {
        Alert.alert('Error', error.message || 'Failed to load PRL course data.');
      }
      setLoading(false);
    }

    fetchData();
  }, [scope]);

  return (
    <View style={s.screen}>
      <Header title="Courses" />
      <ScrollView contentContainerStyle={s.pad}>
        <ScopeBanner scope={scope} />
        <SummaryStrip classes={classes} reports={reports} students={students} />
        {loading ? <ActivityIndicator color="#f59e0b" style={{ marginVertical: 24 }} /> : null}
        <CoursePicker
          title="Modules Under This Stream"
          courses={classes.map((item) => ({
            id: item.id,
            courseCode: getModuleCode(item),
            courseName: getModuleLabel(item),
          }))}
          selectedCourseCode={getModuleCode(selectedCourse)}
          onSelect={(item) => {
            const match = classes.find((entry) => entry.id === item.id) || null;
            setSelectedCourse(match);
          }}
          emptyText="No modules have been created for this PRL stream yet."
        />
        {selectedCourse ? (
          <View style={s.card}>
            <Text style={s.code}>{getModuleCode(selectedCourse)}</Text>
            <Text style={s.name}>{getModuleLabel(selectedCourse)}</Text>
            <Text style={s.sub}>Course: {getCourseLabel(selectedCourse)}</Text>
            <Text style={s.sub}>Lecturer: {selectedCourse.lecturerName || 'Not assigned yet'}</Text>
            <Text style={s.sub}>Reports in stream: {reports.filter((item) => item.courseCode === selectedCourse.courseCode).length}</Text>
          </View>
        ) : null}
        <View style={s.card}>
          <Text style={s.name}>Student Access</Text>
          <Text style={s.sub}>Students registered under this course now see all modules automatically.</Text>
          <Text style={s.sub}>Students in stream: {students.length}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function ReportsTab({ scope }) {
  const [reports, setReports] = useState([]);
  const [feedback, setFeedback] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    if (!scope.ready) {
      setReports([]);
      setLoading(false);
      return;
    }

    async function fetchReports() {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'reports'));
        const nextReports = snap.docs
          .map((item) => normalizeReport({ id: item.id, ...item.data() }))
          .filter((item) => scope.matches(item))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setReports(nextReports);
        setSelectedCourse((current) => {
          if (current?.courseCode) {
            return nextReports.find((item) => item.courseCode === current.courseCode) || nextReports[0] || null;
          }
          return nextReports[0] || null;
        });
      } catch (error) {
        Alert.alert('Error', error.message || 'Failed to load reports.');
      }
      setLoading(false);
    }

    fetchReports();
  }, [scope]);

  async function saveFeedback(reportId) {
    setSavingId(reportId);
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        prlFeedback: feedback[reportId] || '',
        prlReviewedAt: serverTimestamp(),
      });
      setReports((current) =>
        current.map((item) => (item.id === reportId ? { ...item, prlFeedback: feedback[reportId] || '' } : item))
      );
      Alert.alert('Success', 'Feedback saved successfully.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save feedback.');
    }
    setSavingId(null);
  }

  const courseOptions = Array.from(
    new Map(
      reports.map((item) => [
        item.courseCode || item.courseName,
        {
          id: item.courseCode || item.courseName,
          courseCode: item.courseCode || 'GENERAL',
          courseName: item.courseName || item.className || 'General',
        },
      ])
    ).values()
  );

  const visibleReports = reports.filter((item) => {
    if (selectedCourse?.courseCode && item.courseCode !== selectedCourse.courseCode) {
      return false;
    }
    if (filter === 'pending') {
      return !item.prlFeedback;
    }
    if (filter === 'reviewed') {
      return Boolean(item.prlFeedback);
    }
    return true;
  });

  return (
    <View style={s.screen}>
      <Header title="Reports" />
      <FlatList
        data={visibleReports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.pad}
        ListHeaderComponent={
          <>
            <ScopeBanner scope={scope} />
            {loading ? <ActivityIndicator color="#f59e0b" style={{ marginBottom: 16 }} /> : null}
            <CoursePicker
              title="Scoped Course Reports"
              courses={courseOptions}
              selectedCourseCode={selectedCourse?.courseCode || null}
              onSelect={setSelectedCourse}
              emptyText="No reports are available in this PRL stream yet."
            />
            <View style={s.filterRow}>
              {['pending', 'reviewed', 'all'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[s.filterPill, filter === item && s.filterPillActive]}
                  onPress={() => setFilter(item)}
                >
                  <Text style={[s.filterText, filter === item && s.filterTextActive]}>
                    {item === 'pending' ? 'Pending Feedback' : item === 'reviewed' ? 'Reviewed' : 'All Reports'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={<Text style={s.empty}>No reports match the current filter.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.code}>{getModuleCode(item)} | {item.week}</Text>
            <Text style={s.name}>{getModuleLabel(item)}</Text>
            <Text style={s.sub}>Course: {getCourseLabel(item)}</Text>
            <Text style={s.sub}>Faculty: {item.facultyName || 'Not set'}</Text>
            <Text style={s.sub}>Lecturer: {item.lecturerName || 'Unknown'}</Text>
            <Text style={s.sub}>Topic: {item.topic || 'Not entered'}</Text>
            <Text style={s.sub}>Attendance: {item.studentsPresent || 0} / {item.totalStudents || 0}</Text>
            {item.prlFeedback ? <Text style={s.existing}>Current feedback: {item.prlFeedback}</Text> : null}
            <TextInput
              style={s.input}
              placeholder="Add PRL feedback..."
              placeholderTextColor="#64748b"
              value={feedback[item.id] ?? item.prlFeedback ?? ''}
              onChangeText={(value) => setFeedback((current) => ({ ...current, [item.id]: value }))}
              multiline
            />
            <TouchableOpacity style={s.btn} onPress={() => saveFeedback(item.id)} disabled={savingId === item.id}>
              {savingId === item.id ? <ActivityIndicator color="#0f172a" /> : <Text style={s.btnTxt}>Save Feedback</Text>}
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

function MonitoringTab({ scope }) {
  const [summary, setSummary] = useState({ modules: 0, reports: 0, attendance: 0 });

  useEffect(() => {
    if (!scope.ready) {
      setSummary({ modules: 0, reports: 0, attendance: 0 });
      return;
    }

    async function fetchSummary() {
      try {
        const [classesSnap, reportsSnap, attendanceSnap] = await Promise.all([
          getDocs(collection(db, 'classes')),
          getDocs(collection(db, 'reports')),
          getDocs(collection(db, 'studentAttendance')),
        ]);

        setSummary({
          modules: classesSnap.docs.map((item) => item.data()).filter((item) => scope.matches(item)).length,
          reports: reportsSnap.docs.map((item) => item.data()).filter((item) => scope.matches(item)).length,
          attendance: attendanceSnap.docs
            .map((item) => item.data())
            .filter((item) => item.facultyName === scope.facultyName)
            .filter((item) => (scope.courseCode ? item.courseCode === scope.courseCode : true)).length,
        });
      } catch {
        setSummary({ modules: 0, reports: 0, attendance: 0 });
      }
    }

    fetchSummary();
  }, [scope]);

  return (
    <View style={s.screen}>
      <Header title="Monitoring" />
      <ScrollView contentContainerStyle={s.pad}>
        <ScopeBanner scope={scope} />
        <SummaryStrip
          classes={Array.from({ length: summary.modules })}
          reports={Array.from({ length: summary.reports })}
          students={Array.from({ length: summary.attendance })}
        />
        <MonitorCard
          maxItems={20}
          courseCode={scope.courseCode}
          moduleCode={null}
          title="PRL Monitoring Overview"
          emptyText="No monitoring reports are available for this stream yet."
        />
      </ScrollView>
    </View>
  );
}

function RatingTab({ scope }) {
  return (
    <View style={s.screen}>
      <Header title="Rating" />
      <ScrollView contentContainerStyle={s.pad}>
        <ScopeBanner scope={scope} />
        <RatingWidget
          targetId={scope.courseCode || scope.facultyName || 'prl-stream'}
          targetName={scope.ready ? `${scope.title} Performance` : 'PRL Stream'}
          context="prl-rating"
        />
      </ScrollView>
    </View>
  );
}

function ClassesTab({ scope }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scope.ready) {
      setClasses([]);
      setLoading(false);
      return;
    }

    async function fetchClasses() {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'classes'));
        const nextClasses = snap.docs
          .map((item) => normalizeModule({ id: item.id, ...item.data() }))
          .filter((item) => scope.matches(item))
          .sort((a, b) => (a.courseCode || '').localeCompare(b.courseCode || ''));
        setClasses(nextClasses);
      } catch (error) {
        Alert.alert('Error', error.message || 'Failed to load classes.');
      }
      setLoading(false);
    }

    fetchClasses();
  }, [scope]);

  return (
    <View style={s.screen}>
      <Header title="Classes" />
      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.pad}
        ListHeaderComponent={<ScopeBanner scope={scope} />}
        ListEmptyComponent={
          loading ? <ActivityIndicator color="#f59e0b" style={{ marginTop: 30 }} /> : <Text style={s.empty}>No classes are active in this stream yet.</Text>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.code}>{getModuleCode(item)}</Text>
            <Text style={s.name}>{getModuleLabel(item)}</Text>
            <Text style={s.sub}>Faculty: {item.facultyName || 'Not set'}</Text>
            <Text style={s.sub}>Course: {getCourseLabel(item)}</Text>
            <Text style={s.sub}>Lecturer: {item.lecturerName || 'Unassigned'}</Text>
            <Text style={s.sub}>Venue: {item.venue || 'TBA'} | Time: {item.scheduledTime || 'TBA'}</Text>
          </View>
        )}
      />
    </View>
  );
}

export default function PRLScreen() {
  const { profile } = useAuth();
  const scope = useMemo(() => buildScope(profile), [profile]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="Courses">{() => <CoursesTab scope={scope} />}</Tab.Screen>
      <Tab.Screen name="Reports">{() => <ReportsTab scope={scope} />}</Tab.Screen>
      <Tab.Screen name="Monitoring">{() => <MonitoringTab scope={scope} />}</Tab.Screen>
      <Tab.Screen name="Rating">{() => <RatingTab scope={scope} />}</Tab.Screen>
      <Tab.Screen name="Classes">{() => <ClassesTab scope={scope} />}</Tab.Screen>
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f172a' },
  pad: { padding: 16 },
  card: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 12 },
  code: { color: '#f59e0b', fontWeight: '700', fontSize: 13, marginBottom: 2 },
  name: { color: '#f1f5f9', fontWeight: '600', fontSize: 15, marginBottom: 4 },
  sub: { color: '#94a3b8', fontSize: 12, marginBottom: 2 },
  existing: { color: '#fcd34d', fontSize: 12, marginTop: 6, marginBottom: 8, fontStyle: 'italic' },
  input: {
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 10,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  btn: { backgroundColor: '#f59e0b', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  btnTxt: { color: '#0f172a', fontWeight: '700', fontSize: 13 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 32 },
  scopeCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 16 },
  scopeLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  scopeValue: { color: '#f1f5f9', fontSize: 15, fontWeight: '600', marginTop: 6 },
  scopeHint: { color: '#cbd5e1', fontSize: 12, marginTop: 8, lineHeight: 18 },
  scopeError: { color: '#fca5a5', fontSize: 12, marginTop: 8 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  summaryCard: { minWidth: '47%', flexGrow: 1, backgroundColor: '#1e293b', borderRadius: 14, padding: 14 },
  summaryValue: { color: '#f8fafc', fontSize: 24, fontWeight: '800' },
  summaryLabel: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  filterPill: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  filterPillActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  filterText: { color: '#cbd5e1', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#0f172a' },
});

const styles = StyleSheet.create({
  tabBar: { backgroundColor: '#1e293b', borderTopColor: '#334155', borderTopWidth: 1 },
});
