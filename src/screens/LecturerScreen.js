import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { AttendanceTable, CoursePicker, Header, MonitorCard, RatingWidget } from '../sharedComponents/SharedComponents';
import ReportFormFields from '../reportForm/ReportFormFields';
import { getClassesByLecturer } from '../backend/firebase/firestore';
import { getCourseLabel, getModuleCode, getModuleLabel } from '../utils/academicStructure';

const Tab = createBottomTabNavigator();

function LecturerSummary({ profileName, selectedClass, classCount }) {
  return (
    <View style={s.summaryCard}>
      <Text style={s.summaryLabel}>Lecturer</Text>
      <Text style={s.summaryTitle}>{profileName || 'Lecturer account'}</Text>
      <View style={s.summaryRow}>
        <View style={s.summaryStat}>
          <Text style={s.summaryValue}>{classCount}</Text>
          <Text style={s.summaryStatLabel}>Assigned Modules</Text>
        </View>
        <View style={s.summaryStat}>
          <Text style={s.summaryValue}>{getModuleCode(selectedClass)}</Text>
          <Text style={s.summaryStatLabel}>Active Module</Text>
        </View>
      </View>
      <Text style={s.summaryMeta}>Faculty: {selectedClass?.facultyName || 'Waiting for assignment'}</Text>
      <Text style={s.summaryMeta}>Course: {selectedClass ? getCourseLabel(selectedClass) : 'Waiting for assignment'}</Text>
      <Text style={s.summaryHint}>
        {selectedClass ? getModuleLabel(selectedClass) : 'Wait for PL to assign your module before reporting.'}
      </Text>
    </View>
  );
}

function SharedClassPicker({ classes, selectedClass, onSelectClass, loadingClasses, emptyText }) {
  return (
    <>
      {loadingClasses ? <ActivityIndicator color="#f97316" style={{ marginBottom: 16 }} /> : null}
      <CoursePicker
        title="Assigned Classes"
        courses={classes.map((item) => ({
          id: item.id,
          courseCode: getModuleCode(item),
          courseName: `${getModuleLabel(item)}${item.courseName ? ` | ${item.courseName}` : ''}`,
        }))}
        selectedCourseCode={getModuleCode(selectedClass)}
        onSelect={(item) => {
          const match = classes.find((entry) => entry.id === item.id) || null;
          onSelectClass(match);
        }}
        emptyText={emptyText}
      />
    </>
  );
}

function ClassesTab({ classes, loading, error, selectedClass, onSelectClass, profileName }) {
  return (
    <View style={s.screen}>
      <Header title="Classes" />
      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.pad}
        ListHeaderComponent={
          <>
            <LecturerSummary profileName={profileName} selectedClass={selectedClass} classCount={classes.length} />
            {error ? <Text style={s.error}>{error}</Text> : null}
          </>
        }
        ListEmptyComponent={<Text style={s.empty}>No classes assigned yet.</Text>}
        renderItem={({ item }) => (
          <View style={[s.card, selectedClass?.id === item.id && s.cardActive]}>
            <View style={s.cardTop}>
              <Text style={s.courseCode}>{getModuleCode(item)}</Text>
              {selectedClass?.id === item.id ? (
                <View style={s.selectedBadge}>
                  <Text style={s.selectedBadgeText}>Active</Text>
                </View>
              ) : null}
            </View>
            <Text style={s.courseName}>{getModuleLabel(item)}</Text>
            <Text style={s.sub}>Faculty: {item.facultyName || 'Not set'}</Text>
            <Text style={s.sub}>Course: {item.courseName || 'Not set'} ({item.courseCode || '--'})</Text>
            <Text style={s.sub}>Venue: {item.venue || 'TBA'} | {item.scheduledTime || 'Time pending'}</Text>
            <Text onPress={() => onSelectClass(item)} style={s.link}>
              {selectedClass?.id === item.id ? 'Selected for reports, attendance, and monitoring' : 'Use this class'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

function ReportTab({ selectedClass, classes, onSelectClass, loadingClasses, profileName }) {
  return (
    <View style={s.screen}>
      <Header title="Reports" />
      <ScrollView contentContainerStyle={s.pad}>
        <LecturerSummary profileName={profileName} selectedClass={selectedClass} classCount={classes.length} />
        <SharedClassPicker
          classes={classes}
          selectedClass={selectedClass}
          onSelectClass={onSelectClass}
          loadingClasses={loadingClasses}
          emptyText="No class is assigned yet, so report entry is waiting."
        />
        {selectedClass ? (
          <ReportFormFields selectedClass={selectedClass} />
        ) : (
          <Text style={s.hint}>Your report form will open as soon as a class is assigned.</Text>
        )}
      </ScrollView>
    </View>
  );
}

function MonitoringTab({ selectedClass, currentUserId, classes, onSelectClass, loadingClasses, profileName }) {
  return (
    <View style={s.screen}>
      <Header title="Monitoring" />
      <ScrollView contentContainerStyle={s.pad}>
        <LecturerSummary profileName={profileName} selectedClass={selectedClass} classCount={classes.length} />
        <SharedClassPicker
          classes={classes}
          selectedClass={selectedClass}
          onSelectClass={onSelectClass}
          loadingClasses={loadingClasses}
          emptyText="Monitoring will activate after class assignment."
        />
        <MonitorCard
          maxItems={20}
          courseCode={selectedClass?.courseCode || null}
          submittedBy={currentUserId}
          title={selectedClass?.courseCode ? `My Reports: ${getModuleLabel(selectedClass)}` : 'My Reports'}
          emptyText={selectedClass?.courseCode ? `No monitoring reports found for ${getModuleLabel(selectedClass)}.` : 'No monitoring data yet.'}
          moduleCode={selectedClass?.moduleCode || null}
        />
      </ScrollView>
    </View>
  );
}

function RatingTab({ selectedClass, classes, onSelectClass, loadingClasses, profileName }) {
  return (
    <View style={s.screen}>
      <Header title="Rating" />
      <ScrollView contentContainerStyle={s.pad}>
        <LecturerSummary profileName={profileName} selectedClass={selectedClass} classCount={classes.length} />
        <SharedClassPicker
          classes={classes}
          selectedClass={selectedClass}
          onSelectClass={onSelectClass}
          loadingClasses={loadingClasses}
          emptyText="No assigned course is available for rating yet."
        />
        {selectedClass?.courseCode ? (
          <RatingWidget
            targetId={selectedClass.moduleCode || selectedClass.courseCode}
            targetName={`${getModuleLabel(selectedClass)} Delivery`}
            context="lecturer-course-rating"
          />
        ) : (
          <Text style={s.hint}>Course rating will be enabled after assignment.</Text>
        )}
      </ScrollView>
    </View>
  );
}

function AttendanceTab({ classes, selectedClass, onSelectClass, loadingClasses, profileName }) {
  return (
    <View style={s.screen}>
      <Header title="Attendance" />
      <ScrollView contentContainerStyle={s.pad}>
        <LecturerSummary profileName={profileName} selectedClass={selectedClass} classCount={classes.length} />
        <SharedClassPicker
          classes={classes}
          selectedClass={selectedClass}
          onSelectClass={onSelectClass}
          loadingClasses={loadingClasses}
          emptyText="Attendance will appear after a class is assigned."
        />
        {selectedClass?.courseCode ? (
          <AttendanceTable courseCode={selectedClass.courseCode} moduleCode={selectedClass.moduleCode || null} />
        ) : (
          <Text style={s.hint}>Select an assigned class to view or confirm attendance records.</Text>
        )}
      </ScrollView>
    </View>
  );
}

export default function LecturerScreen() {
  const { user, profile } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classesError, setClassesError] = useState(null);

  useEffect(() => {
    if (!user?.uid) {
      setClasses([]);
      setSelectedClass(null);
      setClassesError('Please sign in again to load your assigned modules.');
      setLoadingClasses(false);
      return;
    }

    async function fetchClasses() {
      setLoadingClasses(true);
      try {
        const nextClasses = (await getClassesByLecturer(user.uid))
          .sort((a, b) => (a.courseCode || '').localeCompare(b.courseCode || ''));

        setClasses(nextClasses);
        setSelectedClass((current) => {
          if (current?.id) {
            return nextClasses.find((item) => item.id === current.id) || nextClasses[0] || null;
          }
          return nextClasses[0] || null;
        });
        setClassesError(nextClasses.length ? null : 'You are logged in successfully. Please wait for PL to assign your module.');
      } catch (fetchError) {
        setClasses([]);
        setSelectedClass(null);
        setClassesError(fetchError.message || 'Failed to load classes from Firestore.');
      }
      setLoadingClasses(false);
    }

    fetchClasses();
  }, [user?.uid]);

  const sharedProps = {
    classes,
    selectedClass,
    onSelectClass: setSelectedClass,
    loadingClasses,
    profileName: profile?.name || user?.displayName || null,
  };

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
            Reports: focused ? 'file-document-edit' : 'file-document-edit-outline',
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
            {...sharedProps}
            error={classesError}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Reports">{() => <ReportTab {...sharedProps} />}</Tab.Screen>
      <Tab.Screen name="Monitor">{() => <MonitoringTab {...sharedProps} currentUserId={user?.uid || null} />}</Tab.Screen>
      <Tab.Screen name="Rating">{() => <RatingTab {...sharedProps} />}</Tab.Screen>
      <Tab.Screen name="Attendance">{() => <AttendanceTab {...sharedProps} />}</Tab.Screen>
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f172a' },
  pad: { padding: 16 },
  summaryCard: { backgroundColor: '#111827', borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1f2937' },
  summaryLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  summaryTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700', marginTop: 6 },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 10 },
  summaryStat: { flex: 1, backgroundColor: '#0f172a', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#1f2937' },
  summaryValue: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
  summaryStatLabel: { color: '#94a3b8', fontSize: 11, marginTop: 4 },
  summaryMeta: { color: '#94a3b8', fontSize: 12, marginBottom: 3 },
  summaryHint: { color: '#cbd5e1', fontSize: 13 },
  card: { backgroundColor: '#111827', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1f2937' },
  cardActive: { borderColor: '#f97316', borderWidth: 1.5 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  courseCode: { color: '#f97316', fontWeight: '700', fontSize: 13, marginBottom: 2 },
  courseName: { color: '#f1f5f9', fontWeight: '600', fontSize: 15, marginBottom: 4 },
  sub: { color: '#94a3b8', fontSize: 12 },
  selectedBadge: { backgroundColor: '#7c2d12', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  selectedBadgeText: { color: '#fed7aa', fontSize: 11, fontWeight: '800' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
  error: { color: '#fca5a5', marginBottom: 16 },
  link: { color: '#fdba74', fontSize: 12, fontWeight: '700', marginTop: 10 },
  hint: { color: '#94a3b8', fontSize: 13, marginTop: 8 },
});

const styles = StyleSheet.create({
  tabBar: { backgroundColor: '#111827', borderTopColor: '#1f2937', borderTopWidth: 1, height: 68, paddingBottom: 6, paddingTop: 6 },
});
