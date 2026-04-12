import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ScrollView,
  TextInput, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { CoursePicker, Header, MonitorCard, RatingWidget } from './SharedComponents';
import { useAuth } from './AuthContext';

const Tab = createBottomTabNavigator();

// ── Courses Tab ───────────────────────────────────────────────────────────────
function buildScope(profile) {
  if (!profile?.facultyName) {
    return {
      ready: false,
      error: 'Your PRL profile is missing faculty details. Ask an administrator to update your account.',
      courseName: null,
      title: 'PRL Scope Missing',
    };
  }

  return {
    ready: true,
    error: null,
    courseCode: profile.courseCode || null,
    courseName: profile.courseName || null,
    title: profile.courseCode ? `${profile.facultyName} | ${profile.courseCode}` : profile.facultyName,
    matches(item) {
      if (item?.facultyName && item.facultyName !== profile.facultyName) {
        return false;
      }
      if (profile.courseCode) {
        return item?.courseCode === profile.courseCode;
      }
      if (profile.courseName) {
        return item?.courseName === profile.courseName;
      }
      return item?.facultyName === profile.facultyName;
    },
  };
}

function ScopeBanner({ scope }) {
  return (
    <View style={s.scopeCard}>
      <Text style={s.scopeLabel}>PRL Scope</Text>
      <Text style={s.scopeValue}>{scope.ready ? scope.title : 'Unavailable'}</Text>
      {scope.error ? <Text style={s.scopeError}>{scope.error}</Text> : null}
    </View>
  );
}

function SummaryStrip({ items = [] }) {
  const reviewedCount = items.filter((item) => item.prlFeedback).length;

  return (
    <View style={s.summaryRow}>
      <View style={s.summaryCard}>
        <Text style={s.summaryValue}>{items.length}</Text>
        <Text style={s.summaryLabel}>Reports</Text>
      </View>
      <View style={s.summaryCard}>
        <Text style={s.summaryValue}>{reviewedCount}</Text>
        <Text style={s.summaryLabel}>Reviewed</Text>
      </View>
      <View style={s.summaryCard}>
        <Text style={s.summaryValue}>{Math.max(items.length - reviewedCount, 0)}</Text>
        <Text style={s.summaryLabel}>Pending</Text>
      </View>
    </View>
  );
}

function CoursesTab({ scope }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportCounts, setReportCounts] = useState({});

  useEffect(() => {
    if (!scope.ready) {
      setCourses([]);
      setLoading(false);
      return;
    }

    async function fetch() {
      try {
        const [classesSnap, reportsSnap] = await Promise.all([
          getDocs(collection(db, 'classes')),
          getDocs(collection(db, 'reports')),
        ]);

        const nextCourses = classesSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((item) => scope.matches(item));
        const nextCounts = reportsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((item) => scope.matches(item))
          .reduce((acc, item) => {
            const key = item.courseCode || item.courseName || 'general';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});
        setCourses(nextCourses);
        setReportCounts(nextCounts);
      } catch (_) {}
      setLoading(false);
    }
    fetch();
  }, [scope.ready, scope.title, scope.courseCode, scope.courseName]);

  return (
    <View style={s.screen}>
      <Header title="Courses" />
      <ScopeBanner scope={scope} />
      {loading ? <ActivityIndicator color="#f59e0b" style={{ marginTop: 30 }} /> : (
        <FlatList data={courses} keyExtractor={i => i.id} contentContainerStyle={s.pad}
          ListEmptyComponent={<Text style={s.empty}>No courses found.</Text>}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.code}>{item.courseCode}</Text>
              <Text style={s.name}>{item.courseName}</Text>
              <Text style={s.sub}>Lecturer: {item.lecturerName}</Text>
              <Text style={s.sub}>Venue: {item.venue || 'TBA'} | Time: {item.scheduledTime || 'TBA'}</Text>
              <Text style={s.meta}>Reports under stream: {reportCounts[item.courseCode] || 0}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────
function ReportsTab({ scope }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({});
  const [saving, setSaving] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('pending');
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    if (!scope.ready) {
      setReports([]);
      setLoading(false);
      return;
    }

    async function fetch() {
      try {
        const snap = await getDocs(collection(db, 'reports'));
        const nextReports = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((item) => scope.matches(item))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setReports(nextReports);
        setSelectedCourse((current) => {
          if (!nextReports.length) return null;
          if (current) {
            return nextReports.find((item) => item.courseCode === current.courseCode) || nextReports[0];
          }
          return nextReports[0];
        });
      } catch (_) {}
      setLoading(false);
    }
    fetch();
  }, [scope.ready, scope.title, scope.courseCode, scope.courseName]);

  async function saveFeedback(id) {
    setSaving(id);
    try {
      await updateDoc(doc(db, 'reports', id), { prlFeedback: feedback[id] || '' });
      Alert.alert('Feedback saved!');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setSaving(null);
  }

  if (loading) return <ActivityIndicator color="#f59e0b" style={{ marginTop: 30 }} />;

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
    if (selectedFilter === 'pending') {
      return !item.prlFeedback;
    }
    if (selectedFilter === 'reviewed') {
      return Boolean(item.prlFeedback);
    }
    return true;
  });

  return (
    <View style={s.screen}>
      <Header title="Reports & Feedback" />
      <ScopeBanner scope={scope} />
      <FlatList data={visibleReports} keyExtractor={i => i.id} contentContainerStyle={s.pad}
        ListHeaderComponent={
          <>
            <SummaryStrip items={reports} />
            <CoursePicker
              title="Scoped Courses"
              courses={courseOptions}
              selectedCourseCode={selectedCourse?.courseCode || null}
              onSelect={setSelectedCourse}
              emptyText="No scoped courses found."
            />
            <View style={s.filterRow}>
              {['pending', 'reviewed', 'all'].map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[s.filterPill, selectedFilter === filter && s.filterPillActive]}
                  onPress={() => setSelectedFilter(filter)}
                >
                  <Text style={[s.filterText, selectedFilter === filter && s.filterTextActive]}>
                    {filter === 'pending' ? 'Pending Feedback' : filter === 'reviewed' ? 'Reviewed' : 'All Reports'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={<Text style={s.empty}>No reports match this review filter.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.code}>{item.courseCode}  ·  {item.week}</Text>
            <Text style={s.name}>{item.courseName}</Text>
            <Text style={s.sub}>Topic: {item.topic}</Text>
            <Text style={s.sub}>By: {item.lecturerName}</Text>
            {item.prlFeedback && (
              <Text style={s.existing}>Feedback: {item.prlFeedback}</Text>
            )}
            <TextInput style={s.input} placeholder="Add / update feedback..."
              placeholderTextColor="#64748b"
              value={feedback[item.id] || ''}
              onChangeText={t => setFeedback(prev => ({ ...prev, [item.id]: t }))}
              multiline />
            <TouchableOpacity style={s.btn} onPress={() => saveFeedback(item.id)}
              disabled={saving === item.id}>
              {saving === item.id
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnTxt}>Save Feedback</Text>}
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

// ── Monitoring Tab ────────────────────────────────────────────────────────────
function MonitoringTab({ scope }) {
  return (
    <View style={s.screen}>
      <Header title="Monitoring" />
      <ScopeBanner scope={scope} />
        <MonitorCard
          maxItems={20}
          courseCode={scope.courseCode}
          title="Department Monitoring"
          emptyText="No reports are available in your PRL scope yet."
        />
    </View>
  );
}

// ── Rating Tab ────────────────────────────────────────────────────────────────
function RatingTab({ scope }) {
  return (
    <View style={s.screen}>
      <Header title="Rating" />
      <ScrollView contentContainerStyle={s.pad}>
        <ScopeBanner scope={scope} />
        <RatingWidget
          targetId={scope.ready ? (scope.courseCode || scope.title) : 'prl-scope'}
          targetName={scope.ready ? `${scope.title} Performance` : 'PRL Scope'}
          context="prl-rating"
        />
      </ScrollView>
    </View>
  );
}

// ── Classes Tab ───────────────────────────────────────────────────────────────
function ClassesTab({ scope }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scope.ready) {
      setClasses([]);
      setLoading(false);
      return;
    }

    async function fetch() {
      try {
        const snap = await getDocs(collection(db, 'classes'));
        setClasses(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((item) => scope.matches(item))
        );
      } catch (_) {
        setClasses([]);
      }
      setLoading(false);
    }

    fetch();
  }, [scope.ready, scope.title, scope.courseCode, scope.courseName]);

  return (
    <View style={s.screen}>
      <Header title="Classes" />
      <ScopeBanner scope={scope} />
      {loading ? <ActivityIndicator color="#f59e0b" style={{ marginTop: 30 }} /> : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.pad}
          ListEmptyComponent={<Text style={s.empty}>No classes are assigned in your PRL scope.</Text>}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.code}>{item.courseCode}</Text>
              <Text style={s.name}>{item.courseName}</Text>
              <Text style={s.sub}>Class: {item.className || item.courseName}</Text>
              <Text style={s.sub}>Venue: {item.venue || 'TBA'} | Time: {item.scheduledTime || 'TBA'}</Text>
              <Text style={s.sub}>Lecturer: {item.lecturerName || 'Unassigned'}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function PRLScreen() {
  const { profile } = useAuth();
  const scope = useMemo(() => buildScope(profile), [profile]);

  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: styles.tabBar,
      tabBarActiveTintColor: '#f59e0b', tabBarInactiveTintColor: '#64748b',
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600' } }}>
      <Tab.Screen name="Courses">{() => <CoursesTab scope={scope} />}</Tab.Screen>
      <Tab.Screen name="Reports">{() => <ReportsTab scope={scope} />}</Tab.Screen>
      <Tab.Screen name="Monitoring">{() => <MonitoringTab scope={scope} />}</Tab.Screen>
      <Tab.Screen name="Rating">{() => <RatingTab scope={scope} />}</Tab.Screen>
      <Tab.Screen name="Classes">{() => <ClassesTab scope={scope} />}</Tab.Screen>
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: '#0f172a' },
  pad:      { padding: 16 },
  card:     { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 12 },
  code:     { color: '#f59e0b', fontWeight: '700', fontSize: 13, marginBottom: 2 },
  name:     { color: '#f1f5f9', fontWeight: '600', fontSize: 15, marginBottom: 4 },
  sub:      { color: '#94a3b8', fontSize: 12, marginBottom: 2 },
  meta:     { color: '#fcd34d', fontSize: 12, marginTop: 8, fontWeight: '600' },
  existing: { color: '#6366f1', fontSize: 12, marginTop: 6, marginBottom: 4, fontStyle: 'italic' },
  input:    { backgroundColor: '#0f172a', color: '#f1f5f9', borderRadius: 10,
              padding: 12, fontSize: 13, borderWidth: 1, borderColor: '#334155',
              marginTop: 10, minHeight: 70, textAlignVertical: 'top' },
  btn:      { backgroundColor: '#f59e0b', borderRadius: 10, paddingVertical: 10,
              alignItems: 'center', marginTop: 10 },
  btnTxt:   { color: '#0f172a', fontWeight: '700', fontSize: 13 },
  empty:    { color: '#64748b', textAlign: 'center', marginTop: 40 },
  scopeCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginHorizontal: 16, marginTop: 16 },
  scopeLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  scopeValue: { color: '#f1f5f9', fontSize: 15, fontWeight: '600', marginTop: 6 },
  scopeError: { color: '#fca5a5', fontSize: 12, marginTop: 8 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 14, padding: 14 },
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
