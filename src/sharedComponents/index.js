import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { getCourseLabel, getModuleCode, getModuleLabel } from '../utils/academicStructure';

export function Header({ title }) {
  const { logout } = useAuth();

  return (
    <View style={h.bar}>
      <View>
        <Text style={h.eyebrow}>LUCT Reporting Hub</Text>
        <Text style={h.title}>{title}</Text>
      </View>
      <TouchableOpacity style={h.logoutBtn} onPress={() => logout()}>
        <MaterialCommunityIcons name="logout-variant" size={16} color="#c7d2fe" />
        <Text style={h.logout}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

export function RatingWidget({ targetId, targetName, context = 'general' }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedRating, setSavedRating] = useState(null);
  const storageKey = user?.uid && targetId ? `rating:${user.uid}:${context}:${targetId}` : null;

  useEffect(() => {
    let active = true;

    async function loadSavedRating() {
      if (!storageKey) {
        setSavedRating(null);
        return;
      }

      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (!active) return;
        const parsed = raw ? JSON.parse(raw) : null;
        setSavedRating(parsed);
        if (parsed?.rating) {
          setRating(parsed.rating);
        }
      } catch {
        if (active) {
          setSavedRating(null);
        }
      }
    }

    loadSavedRating();

    return () => {
      active = false;
    };
  }, [storageKey]);

  async function submit() {
    if (!rating) {
      Alert.alert('Select a rating first');
      return;
    }
    if (!user?.uid) {
      Alert.alert('Authentication required', 'Please sign in again to submit a rating.');
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, 'ratings'), {
        targetId,
        targetName,
        context,
        rating,
        ratedBy: user.uid,
        createdAt: serverTimestamp(),
      });
      const nextSaved = {
        rating,
        targetName,
        savedAt: new Date().toISOString(),
      };
      if (storageKey) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(nextSaved));
      }
      setSavedRating(nextSaved);
      Alert.alert('Rating submitted!');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  }

  return (
    <View style={r.card}>
      <Text style={r.title}>Rate: {targetName}</Text>
      <Text style={r.subtitle}>Your feedback helps improve reporting quality.</Text>
      {savedRating ? (
        <Text style={r.savedText}>
          Saved rating: {savedRating.rating}/5
        </Text>
      ) : null}
      <View style={r.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} style={r.starWrap} onPress={() => setRating(star)}>
            <MaterialCommunityIcons
              name={star <= rating ? 'star' : 'star-outline'}
              size={34}
              color={star <= rating ? '#f59e0b' : '#475569'}
            />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={r.ratingHint}>
        {rating ? `You selected ${rating} out of 5` : 'Tap a star to rate this item'}
      </Text>
      <TouchableOpacity style={r.btn} onPress={submit} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : (
          <View style={r.btnRow}>
            <MaterialCommunityIcons name="send-circle" size={18} color="#fff" />
            <Text style={r.btnTxt}>Submit Rating</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

export function CoursePicker({
  title = 'Select Course',
  courses = [],
  selectedCourseCode = null,
  onSelect,
  emptyText = 'No courses available.',
}) {
  if (!courses.length) {
    return <Text style={shared.helperText}>{emptyText}</Text>;
  }

  return (
    <View style={picker.card}>
      <View style={picker.headerRow}>
        <Text style={picker.title}>{title}</Text>
        <View style={picker.countBadge}>
          <Text style={picker.countText}>{courses.length}</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {courses.map((course) => {
          const courseCode = course.courseCode || course.id;
          const isSelected = selectedCourseCode === courseCode;

          return (
            <TouchableOpacity
              key={course.id || courseCode}
              style={[picker.pill, isSelected && picker.pillActive]}
              onPress={() => onSelect?.(course)}
            >
              <Text style={[picker.code, isSelected && picker.codeActive]}>{courseCode}</Text>
              {course.courseName ? (
                <Text style={[picker.name, isSelected && picker.nameActive]} numberOfLines={1}>
                  {course.courseName}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function OptionPicker({
  title = 'Select Option',
  options = [],
  selectedValue = null,
  onSelect,
  emptyText = 'No options available.',
}) {
  if (!options.length) {
    return <Text style={shared.helperText}>{emptyText}</Text>;
  }

  return (
    <View style={picker.card}>
      <View style={picker.headerRow}>
        <Text style={picker.title}>{title}</Text>
        <View style={picker.countBadge}>
          <Text style={picker.countText}>{options.length}</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((option) => {
          const isSelected = selectedValue === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[picker.pill, isSelected && picker.pillActive]}
              onPress={() => onSelect?.(option)}
            >
              <Text style={[picker.code, isSelected && picker.codeActive]}>{option.label}</Text>
              {option.description ? (
                <Text style={[picker.name, isSelected && picker.nameActive]} numberOfLines={1}>
                  {option.description}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function AttendanceTable({ courseCode, moduleCode = null }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!courseCode && !moduleCode) {
      setLoading(false);
      setError('A course or module is required to load attendance.');
      return;
    }

    async function fetchAttendance() {
      try {
        const attendanceQuery = query(
          collection(db, 'reports'),
          where(moduleCode ? 'moduleCode' : 'courseCode', '==', moduleCode || courseCode)
        );
        const snap = await getDocs(attendanceQuery);
        const nextReports = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return bTime - aTime;
          });
        setReports(nextReports);
        setError(null);
      } catch (fetchError) {
        setReports([]);
        setError(fetchError.message || 'Failed to load attendance from Firestore.');
      }
      setLoading(false);
    }

    fetchAttendance();
  }, [courseCode, moduleCode]);

  if (loading) return <ActivityIndicator color="#6366f1" style={{ marginTop: 20 }} />;
  if (error) return <Text style={shared.errorText}>{error}</Text>;
  if (!reports.length) return <Text style={shared.helperText}>No attendance reports found for {moduleCode || courseCode}.</Text>;

  return (
    <View style={a.container}>
      <View style={a.header}>
        {['Week', 'Present', 'Total', '%'].map((heading) => (
          <Text key={heading} style={a.hCell}>{heading}</Text>
        ))}
      </View>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const pct = item.totalStudents ? Math.round((item.studentsPresent / item.totalStudents) * 100) : 0;
          return (
            <View style={a.row}>
              <Text style={a.cell}>{item.week}</Text>
              <Text style={a.cell}>{item.studentsPresent}</Text>
              <Text style={a.cell}>{item.totalStudents}</Text>
              <View style={a.progressWrap}>
                <Text style={[a.cell, pct < 50 && a.low]}>{pct}%</Text>
                <View style={a.progressTrack}>
                  <View style={[a.progressFill, { width: `${Math.max(pct, 6)}%` }, pct < 50 && a.progressLow]} />
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

export function MonitorCard({
  maxItems = 10,
  courseCode = null,
  moduleCode = null,
  facultyName = null,
  submittedBy = null,
  title = 'Latest Reports',
  emptyText = 'No reports available for monitoring yet.',
}) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchReports() {
      try {
        const queryParts = [collection(db, 'reports')];

        if (moduleCode || courseCode) {
          queryParts.push(where(moduleCode ? 'moduleCode' : 'courseCode', '==', moduleCode || courseCode));
        }

        if (submittedBy) {
          queryParts.push(where('submittedBy', '==', submittedBy));
        }

        const reportsQuery = query(...queryParts);
        const snap = await getDocs(reportsQuery);
        const nextReports = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((item) => !facultyName || item.facultyName === facultyName)
          .sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return bTime - aTime;
          })
          .slice(0, maxItems);
        setReports(nextReports);
        setError(null);
      } catch (fetchError) {
        setReports([]);
        setError(fetchError.message || 'Failed to load reports from Firestore.');
      }
      setLoading(false);
    }

    fetchReports();
  }, [courseCode, moduleCode, facultyName, maxItems, submittedBy]);

  if (loading) return <ActivityIndicator color="#6366f1" style={{ marginTop: 30 }} />;
  if (error) return <Text style={shared.errorText}>{error}</Text>;
  if (!reports.length) return <Text style={shared.helperText}>{emptyText}</Text>;

  const totalPresent = reports.reduce((sum, item) => sum + (Number(item.studentsPresent) || 0), 0);
  const totalRegistered = reports.reduce((sum, item) => sum + (Number(item.totalStudents) || 0), 0);
  const avgAttendance = totalRegistered ? Math.round((totalPresent / totalRegistered) * 100) : 0;

  return (
    <FlatList
      data={reports}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={
        <View style={m.summaryCard}>
          <Text style={m.summaryTitle}>{title}</Text>
          <View style={m.summaryRow}>
            <View style={m.summaryStat}>
              <MaterialCommunityIcons name="file-chart-outline" size={18} color="#c7d2fe" />
              <Text style={m.summaryValue}>{reports.length}</Text>
              <Text style={m.summaryLabel}>Reports</Text>
            </View>
            <View style={m.summaryStat}>
              <MaterialCommunityIcons name="account-group-outline" size={18} color="#fcd34d" />
              <Text style={m.summaryValue}>{avgAttendance}%</Text>
              <Text style={m.summaryLabel}>Avg Attendance</Text>
            </View>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <View style={m.card}>
          <View style={m.row}>
            <Text style={m.course}>{getModuleCode(item)}</Text>
            <Text style={m.week}>{item.week}</Text>
          </View>
          <Text style={m.name}>{getModuleLabel(item)}</Text>
          <Text style={m.sub}>
            <MaterialCommunityIcons name="domain" size={13} color="#94a3b8" /> {item.facultyName || 'Faculty pending'}
          </Text>
          <Text style={m.sub}>
            <MaterialCommunityIcons name="book-outline" size={13} color="#94a3b8" /> Course: {getCourseLabel(item)}
          </Text>
          <Text style={m.sub}>
            <MaterialCommunityIcons name="account-tie-outline" size={13} color="#94a3b8" /> {item.lecturerName || 'Unassigned'}
          </Text>
          <Text style={m.sub}>
            <MaterialCommunityIcons name="map-marker-outline" size={13} color="#94a3b8" /> {item.venue || 'Venue pending'}
          </Text>
          <Text style={m.sub}>
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={13} color="#94a3b8" /> Topic: {item.topic}
          </Text>
          <View style={m.attRow}>
            <Text style={m.attLabel}>Attendance</Text>
            <Text style={m.attVal}>{item.studentsPresent} / {item.totalStudents}</Text>
          </View>
        </View>
      )}
    />
  );
}

const h = StyleSheet.create({
  bar: {
    backgroundColor: '#111827',
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  eyebrow: { color: '#60a5fa', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: '800', marginTop: 4 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#312e81',
  },
  logout: { color: '#c7d2fe', fontSize: 13, fontWeight: '700' },
});

const r = StyleSheet.create({
  card: { backgroundColor: '#111827', borderRadius: 18, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#1f2937' },
  title: { color: '#f1f5f9', fontSize: 15, fontWeight: '600', marginBottom: 14 },
  subtitle: { color: '#94a3b8', fontSize: 12, marginTop: -8, marginBottom: 14 },
  savedText: { color: '#86efac', fontSize: 12, marginBottom: 10, fontWeight: '700' },
  stars: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  starWrap: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  ratingHint: { color: '#cbd5e1', fontSize: 12, marginBottom: 16 },
  btn: { backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnTxt: { color: '#fff', fontWeight: '700' },
});

const picker = StyleSheet.create({
  card: { backgroundColor: '#111827', borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1f2937' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: '#f1f5f9', fontSize: 14, fontWeight: '700' },
  countBadge: { backgroundColor: '#1e3a8a', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { color: '#dbeafe', fontSize: 11, fontWeight: '800' },
  pill: {
    backgroundColor: '#0b1120',
    borderColor: '#243041',
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 10,
    minWidth: 116,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pillActive: { backgroundColor: '#1d4ed8', borderColor: '#60a5fa' },
  code: { color: '#cbd5e1', fontSize: 13, fontWeight: '700' },
  codeActive: { color: '#ffffff' },
  name: { color: '#94a3b8', fontSize: 11, marginTop: 4, maxWidth: 140 },
  nameActive: { color: '#c7d2fe' },
});

const a = StyleSheet.create({
  container: { backgroundColor: '#111827', borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#1f2937' },
  header: { flexDirection: 'row', backgroundColor: '#0f172a', padding: 12 },
  hCell: { flex: 1, color: '#94a3b8', fontWeight: '700', fontSize: 12 },
  row: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  cell: { flex: 1, color: '#f1f5f9', fontSize: 13 },
  low: { color: '#ef4444' },
  progressWrap: { flex: 1 },
  progressTrack: { height: 5, backgroundColor: '#1f2937', borderRadius: 999, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: 5, backgroundColor: '#22c55e', borderRadius: 999 },
  progressLow: { backgroundColor: '#ef4444' },
});

const m = StyleSheet.create({
  summaryCard: { backgroundColor: '#111827', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1f2937' },
  summaryTitle: { color: '#f1f5f9', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryStat: { flex: 1 },
  summaryValue: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  summaryLabel: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  card: { backgroundColor: '#111827', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1f2937' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  course: { color: '#60a5fa', fontWeight: '800', fontSize: 13 },
  week: { color: '#64748b', fontSize: 12 },
  name: { color: '#f1f5f9', fontWeight: '600', fontSize: 15, marginBottom: 4 },
  sub: { color: '#94a3b8', fontSize: 12, marginBottom: 2 },
  attRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  attLabel: { color: '#94a3b8', fontSize: 12 },
  attVal: { color: '#f1f5f9', fontWeight: '600', fontSize: 12 },
});

const shared = StyleSheet.create({
  errorText: { color: '#fca5a5', fontSize: 13, padding: 16 },
  helperText: { color: '#94a3b8', fontSize: 13, paddingVertical: 8 },
});
