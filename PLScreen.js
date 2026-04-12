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
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { CoursePicker, Header, MonitorCard, OptionPicker, RatingWidget } from './SharedComponents';
import { prospectusCatalog } from './ProspectusData';
import { useAuth } from './AuthContext';

const Tab = createBottomTabNavigator();

function buildScope(profile) {
  if (!profile?.facultyName) {
    return {
      ready: false,
      error: 'Your PL profile is missing faculty details. Ask an administrator to update your account.',
      facultyName: null,
      courseCode: null,
      courseName: null,
      title: 'PL Scope Missing',
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
    <View style={s.infoCard}>
      <Text style={s.infoTitle}>PL Scope</Text>
      <Text style={s.infoText}>{scope.ready ? scope.title : 'Unavailable'}</Text>
      {scope.error ? <Text style={s.scopeError}>{scope.error}</Text> : null}
    </View>
  );
}

function SummaryStrip({ reports = [], classes = [] }) {
  const reviewedReports = reports.filter((item) => item.prlFeedback).length;

  return (
    <View style={s.summaryRow}>
      <View style={s.summaryCard}>
        <Text style={s.summaryValue}>{classes.length}</Text>
        <Text style={s.summaryLabel}>Classes</Text>
      </View>
      <View style={s.summaryCard}>
        <Text style={s.summaryValue}>{reports.length}</Text>
        <Text style={s.summaryLabel}>Reports</Text>
      </View>
      <View style={s.summaryCard}>
        <Text style={s.summaryValue}>{reviewedReports}</Text>
        <Text style={s.summaryLabel}>PRL Reviewed</Text>
      </View>
    </View>
  );
}

function CoursesTab({ scope }) {
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [facultyName, setFacultyName] = useState('');
  const [venue, setVenue] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [selectedLecturer, setSelectedLecturer] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingLecturers, setLoadingLecturers] = useState(true);
  const [reassigning, setReassigning] = useState(false);
  const [scopedReports, setScopedReports] = useState([]);
  const availableFaculties = useMemo(
    () => prospectusCatalog.filter((faculty) => faculty.name === scope.facultyName),
    [scope.facultyName]
  );

  useEffect(() => {
    fetchCourses();
    fetchLecturers();
  }, [scope.ready, scope.facultyName, scope.courseCode, scope.courseName]);

  useEffect(() => {
    const nextFaculty = availableFaculties[0] || null;
    setSelectedFaculty(nextFaculty);
    setFacultyName(nextFaculty?.name || '');
    setCourseName(nextFaculty?.courses?.[0]?.name || '');
    setCourseCode(nextFaculty?.courses?.[0]?.code || '');
  }, [availableFaculties]);

  async function fetchCourses() {
    if (!scope.ready) {
      setCourses([]);
      setScopedReports([]);
      setSelectedCourse(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'classes'));
      const nextCourses = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((item) => scope.matches(item));
      const reportsSnap = await getDocs(collection(db, 'reports'));
      const nextReports = reportsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((item) => scope.matches(item));
      setCourses(nextCourses);
      setScopedReports(nextReports);
      setSelectedCourse((current) => {
        if (!current) return nextCourses[0] || null;
        return nextCourses.find((item) => item.id === current.id) || nextCourses[0] || null;
      });
    } catch (_) {
      setCourses([]);
      setScopedReports([]);
      setSelectedCourse(null);
    }
    setLoading(false);
  }

  async function fetchLecturers() {
    setLoadingLecturers(true);
    try {
      const lecturerQuery = query(collection(db, 'users'), where('role', '==', 'lecturer'));
      const snap = await getDocs(lecturerQuery);
      const nextLecturers = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((item) => !scope.facultyName || !item.facultyName || item.facultyName === scope.facultyName);
      setLecturers(nextLecturers);
      setSelectedLecturer(nextLecturers[0] || null);
    } catch (_) {
      setLecturers([]);
      setSelectedLecturer(null);
    }
    setLoadingLecturers(false);
  }

  async function addCourse() {
    if (!scope.ready) {
      Alert.alert('Scope missing', 'Your PL profile needs faculty details before you can manage courses.');
      return;
    }
    if (!courseName || !courseCode) {
      Alert.alert('Fill course name and code');
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, 'classes'), {
        courseName,
        courseCode: courseCode.toUpperCase(),
        facultyName: scope.facultyName || facultyName || null,
        venue: venue || null,
        scheduledTime: scheduledTime || null,
        lecturerId: selectedLecturer?.id || null,
        lecturerName: selectedLecturer?.name || null,
        lecturerEmail: selectedLecturer?.email || null,
        createdAt: serverTimestamp(),
      });
      Alert.alert('Course added and lecturer assigned!');
      setCourseName('');
      setCourseCode('');
      setFacultyName(selectedFaculty?.name || '');
      setVenue('');
      setScheduledTime('');
      fetchCourses();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  }

  async function reassignCourse() {
    if (!scope.ready) {
      Alert.alert('Scope missing', 'Your PL profile needs faculty details before you can reassign lecturers.');
      return;
    }
    if (!selectedCourse?.id) {
      Alert.alert('Select a course', 'Choose a course to reassign.');
      return;
    }
    if (!selectedLecturer?.id) {
      Alert.alert('Select a lecturer', 'Choose a lecturer from the database.');
      return;
    }

    setReassigning(true);
    try {
      await updateDoc(doc(db, 'classes', selectedCourse.id), {
        lecturerId: selectedLecturer.id,
        lecturerName: selectedLecturer.name || null,
        lecturerEmail: selectedLecturer.email || null,
        updatedAt: serverTimestamp(),
      });
      Alert.alert('Lecturer reassigned successfully!');
      await fetchCourses();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setReassigning(false);
  }

  return (
    <View style={s.screen}>
      <Header title="Courses" />
      <ScrollView contentContainerStyle={s.pad}>
        <ScopeBanner scope={scope} />
        <SummaryStrip reports={scopedReports} classes={courses} />
        <Text style={s.sectionHead}>Add New Course</Text>
        <OptionPicker
          title="Prospectus Faculties"
          options={availableFaculties.map((faculty) => ({
            value: faculty.id,
            label: faculty.name,
          }))}
          selectedValue={selectedFaculty?.id || null}
          onSelect={(option) => {
            const faculty = prospectusCatalog.find((item) => item.id === option.value) || null;
            setSelectedFaculty(faculty);
            setFacultyName(faculty?.name || '');
            if (faculty?.courses?.length) {
              setCourseName(faculty.courses[0].name);
              setCourseCode(faculty.courses[0].code || '');
            } else {
              setCourseName('');
              setCourseCode('');
            }
          }}
          emptyText={scope.ready ? 'No prospectus faculties are loaded for your PL scope.' : 'Add faculty details to your PL profile to manage courses.'}
        />
        <CoursePicker
          title="Prospectus Courses"
          courses={(selectedFaculty?.courses || []).map((course) => ({
            id: course.id,
            courseCode: course.code || course.name,
            courseName: course.name,
          }))}
          selectedCourseCode={courseCode || null}
          onSelect={(item) => {
            const course = (selectedFaculty?.courses || []).find((entry) => entry.id === item.id);
            setCourseName(course?.name || '');
            setCourseCode(course?.code || '');
            setFacultyName(selectedFaculty?.name || '');
          }}
          emptyText="No prospectus courses are loaded for your faculty."
        />
        <TextInput
          style={s.input}
          placeholder="Course name"
          placeholderTextColor="#64748b"
          value={courseName}
          onChangeText={setCourseName}
        />
        <TextInput
          style={s.input}
          placeholder="Course code"
          placeholderTextColor="#64748b"
          value={courseCode}
          onChangeText={setCourseCode}
          autoCapitalize="characters"
        />
        <TextInput
          style={s.input}
          placeholder="Faculty name"
          placeholderTextColor="#64748b"
          value={facultyName}
          onChangeText={setFacultyName}
        />
        <TextInput
          style={s.input}
          placeholder="Venue"
          placeholderTextColor="#64748b"
          value={venue}
          onChangeText={setVenue}
        />
        <TextInput
          style={s.input}
          placeholder="Scheduled time"
          placeholderTextColor="#64748b"
          value={scheduledTime}
          onChangeText={setScheduledTime}
        />

        <Text style={s.sectionHead}>Assign Lecturer</Text>
        {loadingLecturers ? <ActivityIndicator color="#22c55e" style={{ marginBottom: 16 }} /> : null}
        <CoursePicker
          title="Registered Lecturers"
          courses={lecturers.map((lecturer) => ({
            id: lecturer.id,
            courseCode: lecturer.name || lecturer.email || lecturer.id,
            courseName: `${lecturer.email || 'Lecturer'}${lecturer.facultyName ? ` | ${lecturer.facultyName}` : ''}`,
          }))}
          selectedCourseCode={selectedLecturer?.name || selectedLecturer?.email || selectedLecturer?.id || null}
          onSelect={(item) => {
            const lecturer = lecturers.find((entry) => entry.id === item.id);
            setSelectedLecturer(lecturer || null);
          }}
          emptyText="No registered lecturers found in the database."
        />

        <TouchableOpacity style={s.btn} onPress={addCourse} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Add Course</Text>}
        </TouchableOpacity>

        <Text style={[s.sectionHead, { marginTop: 28 }]}>Reassign Existing Course</Text>
        {loading ? <ActivityIndicator color="#22c55e" style={{ marginBottom: 16 }} /> : null}
        <CoursePicker
          title="Existing Courses"
          courses={courses.map((course) => ({
            id: course.id,
            courseCode: course.courseCode,
            courseName: course.courseName,
          }))}
          selectedCourseCode={selectedCourse?.courseCode || null}
          onSelect={(item) => {
            const course = courses.find((entry) => entry.id === item.id);
            setSelectedCourse(course || null);
          }}
          emptyText="No courses found to reassign."
        />
        {selectedCourse ? (
          <View style={s.infoCard}>
            <Text style={s.infoTitle}>Selected Course</Text>
            <Text style={s.infoText}>{selectedCourse.courseCode} - {selectedCourse.courseName}</Text>
            <Text style={s.infoText}>
              Current Lecturer: {selectedCourse.lecturerName || selectedCourse.lecturerEmail || 'Unassigned'}
            </Text>
          </View>
        ) : null}
        <TouchableOpacity style={s.btnSecondary} onPress={reassignCourse} disabled={reassigning}>
          {reassigning ? <ActivityIndicator color="#0f172a" /> : <Text style={s.btnSecondaryTxt}>Reassign Lecturer</Text>}
        </TouchableOpacity>

        <Text style={[s.sectionHead, { marginTop: 28 }]}>All Courses</Text>
        {loading ? (
          <ActivityIndicator color="#22c55e" />
        ) : (
          courses.map((course) => (
            <View key={course.id} style={s.card}>
              <Text style={s.code}>{course.courseCode}</Text>
              <Text style={s.name}>{course.courseName}</Text>
              {course.lecturerName ? <Text style={s.sub}>Lecturer: {course.lecturerName}</Text> : null}
              {course.venue ? <Text style={s.sub}>Venue: {course.venue}</Text> : null}
              {course.scheduledTime ? <Text style={s.sub}>Time: {course.scheduledTime}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function ReportsTab({ scope }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('reviewed');

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
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((item) => scope.matches(item))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setReports(nextReports);
      } catch (_) {
        setReports([]);
      }
      setLoading(false);
    }
    fetch();
  }, [scope.ready, scope.facultyName, scope.courseCode, scope.courseName]);

  return (
    <View style={s.screen}>
      <Header title="Reports" />
      <ScopeBanner scope={scope} />
      {loading ? (
        <ActivityIndicator color="#22c55e" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={reports.filter((item) => {
            if (selectedFilter === 'reviewed') return Boolean(item.prlFeedback);
            if (selectedFilter === 'pending') return !item.prlFeedback;
            return true;
          })}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.pad}
          ListHeaderComponent={
            <View style={s.filterRow}>
              {['reviewed', 'pending', 'all'].map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[s.filterPill, selectedFilter === filter && s.filterPillActive]}
                  onPress={() => setSelectedFilter(filter)}
                >
                  <Text style={[s.filterText, selectedFilter === filter && s.filterTextActive]}>
                    {filter === 'reviewed' ? 'Reports From PRL' : filter === 'pending' ? 'Awaiting PRL' : 'All Reports'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          }
          ListEmptyComponent={<Text style={s.noFeedback}>No reports match this PL review filter.</Text>}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.code}>{item.courseCode} | {item.week}</Text>
              <Text style={s.name}>{item.courseName}</Text>
              <Text style={s.sub}>Topic: {item.topic}</Text>
              <Text style={s.sub}>Lecturer: {item.lecturerName}</Text>
              <Text style={s.sub}>Attendance: {item.studentsPresent || 0} / {item.totalStudents || 0}</Text>
              {item.prlFeedback ? <Text style={s.feedback}>PRL: {item.prlFeedback}</Text> : <Text style={s.noFeedback}>No PRL feedback yet</Text>}
            </View>
          )}
        />
      )}
    </View>
  );
}

function MonitoringTab({ scope }) {
  return (
    <View style={s.screen}>
      <Header title="Monitoring" />
      <ScopeBanner scope={scope} />
      <MonitorCard
        maxItems={20}
        courseCode={scope.courseCode}
        title="Program Monitoring"
        emptyText="No program monitoring reports are available in your PL scope yet."
      />
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
  }, [scope.ready, scope.facultyName, scope.courseCode, scope.courseName]);

  return (
    <View style={s.screen}>
      <Header title="Classes" />
      <ScopeBanner scope={scope} />
      {loading ? (
        <ActivityIndicator color="#22c55e" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.pad}
          ListEmptyComponent={<Text style={s.noFeedback}>No classes found in your PL scope.</Text>}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.code}>{item.courseCode}</Text>
              <Text style={s.name}>{item.courseName}</Text>
              {item.lecturerName ? <Text style={s.sub}>Lecturer: {item.lecturerName}</Text> : null}
              <Text style={s.sub}>Venue: {item.venue || 'TBA'} | Time: {item.scheduledTime || 'TBA'}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function LecturesTab({ scope }) {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scope.ready) {
      setLectures([]);
      setLoading(false);
      return;
    }

    async function fetch() {
      try {
        const snap = await getDocs(collection(db, 'reports'));
        const nextLectures = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((item) => scope.matches(item))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setLectures(nextLectures);
      } catch (_) {
        setLectures([]);
      }
      setLoading(false);
    }
    fetch();
  }, [scope.ready, scope.facultyName, scope.courseCode, scope.courseName]);

  return (
    <View style={s.screen}>
      <Header title="Lectures" />
      <ScopeBanner scope={scope} />
      {loading ? (
        <ActivityIndicator color="#22c55e" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={lectures}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.pad}
          ListEmptyComponent={<Text style={s.noFeedback}>No lectures found in your PL scope.</Text>}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.code}>{item.lecturerName}</Text>
              <Text style={s.name}>{item.courseName}</Text>
              <Text style={s.sub}>{item.week} | {item.dateOfLecture}</Text>
              <Text style={s.sub}>Topic: {item.topic}</Text>
            </View>
          )}
        />
      )}
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
          targetId={scope.courseCode || scope.facultyName || 'program'}
          targetName={scope.ready ? `${scope.title} Quality` : 'Program Quality'}
          context="pl-rating"
        />
      </ScrollView>
    </View>
  );
}

export default function PLScreen() {
  const { profile } = useAuth();
  const scope = useMemo(() => buildScope(profile), [profile]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#22c55e',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="Courses">{() => <CoursesTab scope={scope} />}</Tab.Screen>
      <Tab.Screen name="Reports">{() => <ReportsTab scope={scope} />}</Tab.Screen>
      <Tab.Screen name="Monitor">{() => <MonitoringTab scope={scope} />}</Tab.Screen>
      <Tab.Screen name="Classes">{() => <ClassesTab scope={scope} />}</Tab.Screen>
      <Tab.Screen name="Lectures">{() => <LecturesTab scope={scope} />}</Tab.Screen>
      <Tab.Screen name="Rating">{() => <RatingTab scope={scope} />}</Tab.Screen>
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f172a' },
  pad: { padding: 16 },
  sectionHead: { color: '#f1f5f9', fontWeight: '700', fontSize: 16, marginBottom: 12 },
  card: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 12 },
  infoCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 12 },
  infoTitle: { color: '#f1f5f9', fontWeight: '700', fontSize: 14, marginBottom: 8 },
  infoText: { color: '#94a3b8', fontSize: 12, marginBottom: 2 },
  code: { color: '#22c55e', fontWeight: '700', fontSize: 13, marginBottom: 2 },
  name: { color: '#f1f5f9', fontWeight: '600', fontSize: 15, marginBottom: 4 },
  sub: { color: '#94a3b8', fontSize: 12, marginBottom: 2 },
  feedback: { color: '#6366f1', fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  noFeedback: { color: '#334155', fontSize: 12, marginTop: 6 },
  scopeError: { color: '#fca5a5', fontSize: 12, marginTop: 8 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 14, padding: 14 },
  summaryValue: { color: '#f8fafc', fontSize: 24, fontWeight: '800' },
  summaryLabel: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  filterPill: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  filterPillActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  filterText: { color: '#cbd5e1', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#0f172a' },
  input: {
    backgroundColor: '#1e293b',
    color: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  btn: { backgroundColor: '#22c55e', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  btnTxt: { color: '#0f172a', fontWeight: '700', fontSize: 15 },
  btnSecondary: {
    backgroundColor: '#bbf7d0',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  btnSecondaryTxt: { color: '#0f172a', fontWeight: '700', fontSize: 15 },
});

const styles = StyleSheet.create({
  tabBar: { backgroundColor: '#1e293b', borderTopColor: '#334155', borderTopWidth: 1 },
});
