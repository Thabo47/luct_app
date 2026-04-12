import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { AttendanceTable, CoursePicker, Header, MonitorCard, RatingWidget } from './SharedComponents';
import ReportFormFields from './ReportFormFields';

const Tab = createBottomTabNavigator();

function ClassesTab({ classes, loading, error, selectedClass, onSelectClass }) {
  return (
    <View style={s.screen}>
      <Header title="My Classes" />
      {error ? <Text style={s.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color="#6366f1" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.pad}
          ListEmptyComponent={<Text style={s.empty}>No classes assigned yet.</Text>}
          renderItem={({ item }) => (
            <View style={[s.card, selectedClass?.id === item.id && s.cardActive]}>
              <View style={s.cardTop}>
                <Text style={s.courseCode}>{item.courseCode}</Text>
                {selectedClass?.id === item.id ? (
                  <View style={s.selectedBadge}>
                    <Text style={s.selectedBadgeText}>Active</Text>
                  </View>
                ) : null}
              </View>
              <Text style={s.courseName}>{item.courseName}</Text>
              <Text style={s.sub}>Venue: {item.venue || 'TBA'} | {item.scheduledTime || 'Time pending'}</Text>
              <Text onPress={() => onSelectClass(item)} style={s.link}>
                {selectedClass?.id === item.id ? 'Selected for report and attendance' : 'Use this class'}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function ReportTab({ selectedClass }) {
  return (
    <View style={s.screen}>
      <Header title="Submit Report" />
      <ReportFormFields selectedClass={selectedClass} />
    </View>
  );
}

function MonitoringTab({ selectedClass, currentUserId }) {
  return (
    <View style={s.screen}>
      <Header title="Monitoring" />
      <MonitorCard
        maxItems={20}
        courseCode={selectedClass?.courseCode || null}
        submittedBy={currentUserId}
        title={selectedClass?.courseCode ? `My Reports: ${selectedClass.courseCode}` : 'My Reports'}
        emptyText={
          selectedClass?.courseCode
            ? `No monitoring reports found for ${selectedClass.courseCode}.`
            : 'No monitoring reports found for your account yet.'
        }
      />
    </View>
  );
}

function RatingTab() {
  return (
    <View style={s.screen}>
      <Header title="Rating" />
      <ScrollView contentContainerStyle={s.pad}>
        <RatingWidget targetId="self" targetName="My Lecture Quality" context="self-rating" />
      </ScrollView>
    </View>
  );
}

function AttendanceTab({ classes, selectedClass, onSelectClass, loadingClasses }) {
  return (
    <View style={s.screen}>
      <Header title="Student Attendance" />
      <ScrollView contentContainerStyle={s.pad}>
        {loadingClasses ? <ActivityIndicator color="#6366f1" style={{ marginBottom: 16 }} /> : null}
        <CoursePicker
          title="Class Attendance"
          courses={classes}
          selectedCourseCode={selectedClass?.courseCode || null}
          onSelect={onSelectClass}
          emptyText="No classes are assigned yet."
        />
        {selectedClass?.courseCode ? (
          <AttendanceTable courseCode={selectedClass.courseCode} />
        ) : (
          <Text style={s.hint}>Select a class from Classes or above to load attendance.</Text>
        )}
      </ScrollView>
    </View>
  );
}

export default function LecturerScreen() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classesError, setClassesError] = useState(null);

  useEffect(() => {
    if (!user?.uid) {
      setClasses([]);
      setSelectedClass(null);
      setClassesError('Please sign in again to load your classes.');
      setLoadingClasses(false);
      return;
    }

    async function fetchClasses() {
      setLoadingClasses(true);
      try {
        const classesQuery = query(collection(db, 'classes'), where('lecturerId', '==', user.uid));
        const snap = await getDocs(classesQuery);
        const nextClasses = snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
        setClasses(nextClasses);
        setSelectedClass((current) => {
          if (current) {
            return nextClasses.find((item) => item.id === current.id) || nextClasses[0] || null;
          }
          return nextClasses[0] || null;
        });
        setClassesError(null);
      } catch (fetchError) {
        setClasses([]);
        setSelectedClass(null);
        setClassesError(fetchError.message || 'Failed to load classes from Firestore.');
      }
      setLoadingClasses(false);
    }

    fetchClasses();
  }, [user?.uid]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Classes: focused ? 'view-grid' : 'view-grid-outline',
            Report: focused ? 'file-document-edit' : 'file-document-edit-outline',
            Monitor: focused ? 'chart-box' : 'chart-box-outline',
            Rating: focused ? 'star' : 'star-outline',
            Attendance: focused ? 'account-check' : 'account-check-outline',
          };
          return <MaterialCommunityIcons name={icons[route.name] || 'circle-outline'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Classes">
        {() => (
          <ClassesTab
            classes={classes}
            loading={loadingClasses}
            error={classesError}
            selectedClass={selectedClass}
            onSelectClass={setSelectedClass}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Report">
        {() => <ReportTab selectedClass={selectedClass} />}
      </Tab.Screen>
      <Tab.Screen name="Monitor">
        {() => <MonitoringTab selectedClass={selectedClass} currentUserId={user?.uid || null} />}
      </Tab.Screen>
      <Tab.Screen name="Rating" component={RatingTab} />
      <Tab.Screen name="Attendance">
        {() => (
          <AttendanceTab
            classes={classes}
            selectedClass={selectedClass}
            onSelectClass={setSelectedClass}
            loadingClasses={loadingClasses}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f172a' },
  pad: { padding: 16 },
  card: { backgroundColor: '#111827', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1f2937' },
  cardActive: { borderColor: '#f97316', borderWidth: 1.5, shadowColor: '#f97316', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  courseCode: { color: '#f97316', fontWeight: '700', fontSize: 13, marginBottom: 2 },
  courseName: { color: '#f1f5f9', fontWeight: '600', fontSize: 15, marginBottom: 4 },
  sub: { color: '#94a3b8', fontSize: 12 },
  selectedBadge: { backgroundColor: '#7c2d12', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  selectedBadgeText: { color: '#fed7aa', fontSize: 11, fontWeight: '800' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
  error: { color: '#fca5a5', paddingHorizontal: 16, paddingTop: 16 },
  link: { color: '#fdba74', fontSize: 12, fontWeight: '700', marginTop: 10 },
  hint: { color: '#94a3b8', fontSize: 13, marginTop: 8 },
});

const styles = StyleSheet.create({
  tabBar: { backgroundColor: '#111827', borderTopColor: '#1f2937', borderTopWidth: 1, height: 68, paddingBottom: 6, paddingTop: 6 },
});
