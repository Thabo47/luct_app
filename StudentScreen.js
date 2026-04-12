import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import { AttendanceTable, CoursePicker, Header, MonitorCard, RatingWidget } from './SharedComponents';
import { db } from './firebase';
import { useAuth } from './AuthContext';

const Tab = createBottomTabNavigator();

function ScopeCard({ facultyName, selectedCourse }) {
  return (
    <View style={s.scopeCard}>
      <View style={s.scopeTop}>
        <View style={s.scopeHero}>
          <MaterialCommunityIcons name="account-school-outline" size={20} color="#bfdbfe" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.scopeLabel}>My Faculty</Text>
          <Text style={s.scopeValue}>{facultyName || 'Not assigned'}</Text>
        </View>
      </View>
      <View style={s.scopeCourseRow}>
        <Text style={s.scopeLabel}>Selected Course</Text>
        <View style={s.scopePill}>
          <Text style={s.scopePillText}>{selectedCourse?.courseCode || 'No course'}</Text>
        </View>
      </View>
      <Text style={s.scopeCourseName}>
        {selectedCourse?.courseName || 'Choose a course below'}
      </Text>
    </View>
  );
}

function MonitoringTab({ facultyName, courses, selectedCourse, onSelectCourse, loadingCourses, scopeError }) {
  return (
    <View style={s.screen}>
      <Header title="Monitoring" />
      <ScrollView contentContainerStyle={s.pad}>
        <ScopeCard facultyName={facultyName} selectedCourse={selectedCourse} />
        <Text style={s.hint}>Choose one of your faculty courses to monitor lecture activity.</Text>
        {scopeError ? <Text style={s.error}>{scopeError}</Text> : null}
        {loadingCourses ? <ActivityIndicator color="#6366f1" style={{ marginBottom: 16 }} /> : null}
        <CoursePicker
          title="My Faculty Courses"
          courses={courses}
          selectedCourseCode={selectedCourse?.courseCode || null}
          onSelect={onSelectCourse}
          emptyText="No courses were found for your faculty profile."
        />
        {selectedCourse?.courseCode ? (
          <MonitorCard
            maxItems={20}
            courseCode={selectedCourse.courseCode}
            title={`Monitoring: ${selectedCourse.courseCode}`}
            emptyText={`No monitoring reports found for ${selectedCourse.courseCode}.`}
          />
        ) : (
          <Text style={s.hint}>Select a course above to see monitoring.</Text>
        )}
      </ScrollView>
    </View>
  );
}

function RatingTab({ facultyName, courses, selectedCourse, onSelectCourse, loadingCourses, scopeError }) {
  return (
    <View style={s.screen}>
      <Header title="Rating" />
      <ScrollView contentContainerStyle={s.pad}>
        <ScopeCard facultyName={facultyName} selectedCourse={selectedCourse} />
        <Text style={s.hint}>Choose one of your faculty courses before submitting a rating.</Text>
        {scopeError ? <Text style={s.error}>{scopeError}</Text> : null}
        {loadingCourses ? <ActivityIndicator color="#6366f1" style={{ marginBottom: 16 }} /> : null}
        <CoursePicker
          title="My Faculty Courses"
          courses={courses}
          selectedCourseCode={selectedCourse?.courseCode || null}
          onSelect={onSelectCourse}
          emptyText="No courses were found for your faculty profile."
        />
        {selectedCourse?.courseCode ? (
          <RatingWidget
            targetId={selectedCourse.courseCode}
            targetName={selectedCourse.courseName || selectedCourse.courseCode}
            context="student-course-rating"
          />
        ) : (
          <Text style={s.hint}>Select a course above to rate it.</Text>
        )}
      </ScrollView>
    </View>
  );
}

function AttendanceTab({ facultyName, courses, selectedCourse, onSelectCourse, loadingCourses, scopeError }) {
  return (
    <View style={s.screen}>
      <Header title="My Attendance" />
      <ScrollView contentContainerStyle={s.pad}>
        <ScopeCard facultyName={facultyName} selectedCourse={selectedCourse} />
        <Text style={s.hint}>Choose one of your faculty courses to view attendance.</Text>
        {scopeError ? <Text style={s.error}>{scopeError}</Text> : null}
        {loadingCourses ? <ActivityIndicator color="#6366f1" style={{ marginBottom: 16 }} /> : null}
        <CoursePicker
          title="My Faculty Courses"
          courses={courses}
          selectedCourseCode={selectedCourse?.courseCode || null}
          onSelect={onSelectCourse}
          emptyText="No courses were found for your faculty profile."
        />
        {selectedCourse?.courseCode ? (
          <AttendanceTable courseCode={selectedCourse.courseCode} />
        ) : (
          <Text style={s.hint}>Select a course above to load attendance.</Text>
        )}
      </ScrollView>
    </View>
  );
}

export default function StudentScreen() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [scopeError, setScopeError] = useState(null);

  useEffect(() => {
    if (!profile?.facultyName) {
      setCourses([]);
      setSelectedCourse(null);
      setScopeError('Your student profile is missing faculty details. Please ask an administrator to update your account.');
      setLoadingCourses(false);
      return;
    }

    if (!profile?.courseCode && !profile?.courseName) {
      setCourses([]);
      setSelectedCourse(null);
      setScopeError('Your student profile is missing course details. Please ask an administrator to update your account.');
      setLoadingCourses(false);
      return;
    }

    async function fetchCourses() {
      setLoadingCourses(true);
      try {
        const snap = await getDocs(collection(db, 'classes'));
        const nextCourses = snap.docs
          .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
          .filter((item) => item.facultyName === profile.facultyName)
          .filter((item) => {
            if (profile.courseCode) {
              return item.courseCode === profile.courseCode;
            }
            return item.courseName === profile.courseName;
          });

        setCourses(nextCourses);
        setSelectedCourse(() => {
          const preferred =
            nextCourses.find(
              (item) =>
                (profile.courseCode && item.courseCode === profile.courseCode) ||
                (profile.courseName && item.courseName === profile.courseName)
            ) || null;
          return preferred || nextCourses[0] || null;
        });
        setScopeError(nextCourses.length ? null : 'No class data was found for your registered course.');
      } catch {
        setCourses([]);
        setSelectedCourse(null);
        setScopeError('Failed to load your faculty course data.');
      }
      setLoadingCourses(false);
    }

    fetchCourses();
  }, [profile?.courseCode, profile?.courseName, profile?.facultyName]);

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
      <Tab.Screen name="Monitoring">
        {() => (
          <MonitoringTab
            facultyName={profile?.facultyName || null}
            courses={courses}
            selectedCourse={selectedCourse}
            onSelectCourse={setSelectedCourse}
            loadingCourses={loadingCourses}
            scopeError={scopeError}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Rating">
        {() => (
          <RatingTab
            facultyName={profile?.facultyName || null}
            courses={courses}
            selectedCourse={selectedCourse}
            onSelectCourse={setSelectedCourse}
            loadingCourses={loadingCourses}
            scopeError={scopeError}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Attendance">
        {() => (
          <AttendanceTab
            facultyName={profile?.facultyName || null}
            courses={courses}
            selectedCourse={selectedCourse}
            onSelectCourse={setSelectedCourse}
            loadingCourses={loadingCourses}
            scopeError={scopeError}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f172a' },
  pad: { padding: 16 },
  hint: { color: '#64748b', fontSize: 13, marginBottom: 16 },
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
  scopeLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  scopeValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  scopeCourseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  scopePill: { backgroundColor: '#1e3a8a', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  scopePillText: { color: '#dbeafe', fontSize: 11, fontWeight: '800' },
  scopeCourseName: { color: '#cbd5e1', fontSize: 14, fontWeight: '600' },
});

const styles = StyleSheet.create({
  tabBar: { backgroundColor: '#111827', borderTopColor: '#1f2937', borderTopWidth: 1, height: 66, paddingBottom: 6, paddingTop: 6 },
});
