import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header, RatingWidget } from '../sharedComponents/SharedComponents';
import { getCourseOptionsForFaculty, getFacultyOptions, prospectusCatalog } from '../prospectusData';
import { useAuth } from '../context/AuthContext';
import { DropdownField, EmptyState, InfoRows, PageSection, StatsGrid } from '../components/AppUI';
import { assignLecturerToClass, createClass, getClasses, getCollectionItems, getRatings, getReports, getUsers } from '../services/firestore';
import { getCourseLabel, getModuleCode, getModuleLabel } from '../utils/academicStructure';

const Tab = createBottomTabNavigator();

function usePLData() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [attendance, setAttendance] = useState([]);

  async function refresh() {
    setLoading(true);
    try {
      const [classes, reports, users, ratings, attendance] = await Promise.all([
        getClasses(),
        getReports(),
        getUsers(),
        getRatings(),
        getCollectionItems('studentAttendance'),
      ]);
      setClasses(classes);
      setReports(reports);
      setUsers(users);
      setRatings(ratings);
      setAttendance(attendance);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to load program data.');
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  return { loading, classes, reports, users, ratings, attendance, refresh };
}

function filterByFaculty(items, facultyName) {
  if (!facultyName) {
    return items;
  }
  return items.filter((item) => item?.facultyName === facultyName);
}

function DashboardTab({ profileName, data, selectedFacultyId, setSelectedFacultyId }) {
  const selectedFaculty = prospectusCatalog.find((item) => item.id === selectedFacultyId) || null;
  const facultyName = selectedFaculty?.name || null;
  const facultyClasses = filterByFaculty(data.classes, facultyName);
  const facultyReports = filterByFaculty(data.reports, facultyName);
  const facultyAttendance = filterByFaculty(data.attendance, facultyName);
  const facultyLecturers = data.users.filter((item) => item.role === 'lecturer' && (!facultyName || item.facultyName === facultyName));
  const facultyStudents = data.users.filter((item) => item.role === 'student' && (!facultyName || item.facultyName === facultyName));

  return (
    <View style={s.screen}>
      <Header title="PL Dashboard" />
      <ScrollView contentContainerStyle={s.pad}>
        <PageSection
          title={profileName || 'Program Leader'}
          subtitle="Simple dashboard for faculties, courses, modules, reports, lecturers, and attendance."
        >
          <DropdownField
            label="Faculty"
            placeholder="Choose faculty"
            options={getFacultyOptions()}
            value={selectedFacultyId}
            onChange={setSelectedFacultyId}
          />
          <InfoRows
            rows={[
              { label: 'Selected Faculty', value: facultyName || 'Not selected' },
              { label: 'Courses In Prospectus', value: String((selectedFaculty?.courses || []).length) },
              { label: 'Latest Report', value: facultyReports[0]?.topic || 'No report yet' },
            ]}
          />
        </PageSection>

        <StatsGrid
          items={[
            { label: 'Modules', value: facultyClasses.length },
            { label: 'Reports', value: facultyReports.length },
            { label: 'Lecturers', value: facultyLecturers.length },
            { label: 'Attendance Logs', value: facultyAttendance.length },
          ]}
        />

        <PageSection title="Faculty Snapshot" subtitle="Quick overview of the currently selected faculty.">
          {!facultyClasses.length ? (
            <EmptyState text="No modules found for this faculty yet." />
          ) : (
            facultyClasses.slice(0, 4).map((item) => (
              <View key={item.id} style={s.listCard}>
                <Text style={s.code}>{getModuleCode(item)}</Text>
                <Text style={s.name}>{getModuleLabel(item)}</Text>
                <Text style={s.sub}>Course: {getCourseLabel(item)}</Text>
                <Text style={s.sub}>Lecturer: {item.lecturerName || 'Unassigned'}</Text>
              </View>
            ))
          )}
        </PageSection>

        <PageSection title="Student Reach" subtitle="Students are now linked by faculty and course, so they automatically see course modules.">
          <StatsGrid
            items={[
              { label: 'Students', value: facultyStudents.length },
              { label: 'Ratings', value: data.ratings.filter((item) => !facultyName || item.targetName?.includes(facultyName)).length },
            ]}
          />
        </PageSection>
      </ScrollView>
    </View>
  );
}

function ModulesTab({ data, selectedFacultyId, setSelectedFacultyId, refresh }) {
  const [selectedCourseId, setSelectedCourseId] = useState(prospectusCatalog[0]?.courses?.[0]?.id || null);
  const [selectedLecturerId, setSelectedLecturerId] = useState(null);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [moduleName, setModuleName] = useState('');
  const [moduleCode, setModuleCode] = useState('');
  const [venue, setVenue] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const selectedFaculty = prospectusCatalog.find((item) => item.id === selectedFacultyId) || null;
  const selectedCourse = selectedFaculty?.courses.find((item) => item.id === selectedCourseId) || selectedFaculty?.courses?.[0] || null;
  const facultyModules = data.classes.filter((item) => !selectedFaculty?.name || item.facultyName === selectedFaculty.name);
  const lecturers = data.users.filter((item) => item.role === 'lecturer');
  const selectedLecturer = lecturers.find((item) => item.id === selectedLecturerId) || null;
  const selectedModule = facultyModules.find((item) => item.id === selectedModuleId) || null;

  useEffect(() => {
    setSelectedModuleId(facultyModules[0]?.id || null);
  }, [selectedFacultyId, data.classes.length]);

  async function addModule() {
    if (!selectedFaculty?.name || !selectedCourse?.name || !selectedCourse?.code || !moduleName.trim()) {
      Alert.alert('Missing fields', 'Select faculty and course, then enter a module name.');
      return;
    }

    setSaving(true);
    try {
      await createClass({
        facultyName: selectedFaculty.name,
        courseName: selectedCourse.name,
        courseCode: selectedCourse.code,
        className: moduleName.trim(),
        moduleName: moduleName.trim(),
        moduleCode: moduleCode.trim() ? moduleCode.trim().toUpperCase() : null,
        venue: venue.trim() || null,
        scheduledTime: scheduledTime.trim() || null,
        lecturerId: selectedLecturer?.id || null,
        lecturerName: selectedLecturer?.name || null,
        lecturerEmail: selectedLecturer?.email || null,
      });

      setModuleName('');
      setModuleCode('');
      setVenue('');
      setScheduledTime('');
      await refresh();
      Alert.alert('Success', 'Module added successfully.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add module.');
    }
    setSaving(false);
  }

  async function assignLecturer() {
    if (!selectedModule?.id || !selectedLecturer?.id) {
      Alert.alert('Missing selection', 'Choose a module and lecturer first.');
      return;
    }

    setAssigning(true);
    try {
      await assignLecturerToClass(selectedModule.id, selectedLecturer);
      await refresh();
      Alert.alert('Success', 'Lecturer assigned to module.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to assign lecturer.');
    }
    setAssigning(false);
  }

  return (
    <View style={s.screen}>
      <Header title="Modules" />
      <ScrollView contentContainerStyle={s.pad}>
        <PageSection title="Create Module" subtitle="Add a clean module or class under a selected course.">
          <DropdownField label="Faculty" options={getFacultyOptions()} value={selectedFacultyId} onChange={setSelectedFacultyId} />
          <DropdownField
            label="Course"
            options={getCourseOptionsForFaculty(selectedFacultyId).map((item) => ({
              value: item.id,
              label: `${item.courseName} (${item.courseCode})`,
            }))}
            value={selectedCourseId}
            onChange={setSelectedCourseId}
          />
          <TextInput style={s.input} placeholder="Module / class name" placeholderTextColor="#64748b" value={moduleName} onChangeText={setModuleName} />
          <TextInput style={s.input} placeholder="Module code" placeholderTextColor="#64748b" value={moduleCode} onChangeText={setModuleCode} autoCapitalize="characters" />
          <TextInput style={s.input} placeholder="Venue" placeholderTextColor="#64748b" value={venue} onChangeText={setVenue} />
          <TextInput style={s.input} placeholder="Scheduled time" placeholderTextColor="#64748b" value={scheduledTime} onChangeText={setScheduledTime} />
          <DropdownField
            label="Default Lecturer"
            placeholder="Choose lecturer"
            options={lecturers.map((item) => ({
              value: item.id,
              label: item.name || item.email || item.id,
            }))}
            value={selectedLecturerId}
            onChange={setSelectedLecturerId}
          />
          <TouchableOpacity style={s.primaryBtn} onPress={addModule} disabled={saving}>
            {saving ? <ActivityIndicator color="#052e16" /> : <Text style={s.primaryBtnText}>Add Module</Text>}
          </TouchableOpacity>
        </PageSection>

        <PageSection title="Assign Lecturer" subtitle="Choose an existing module and connect it to a lecturer.">
          <DropdownField
            label="Module"
            placeholder="Choose module"
            options={facultyModules.map((item) => ({
              value: item.id,
              label: `${getModuleLabel(item)} (${getModuleCode(item)})`,
            }))}
            value={selectedModuleId}
            onChange={setSelectedModuleId}
          />
          <DropdownField
            label="Lecturer"
            placeholder="Choose lecturer"
            options={lecturers.map((item) => ({
              value: item.id,
              label: item.name || item.email || item.id,
            }))}
            value={selectedLecturerId}
            onChange={setSelectedLecturerId}
          />
          <TouchableOpacity style={s.secondaryBtn} onPress={assignLecturer} disabled={assigning}>
            {assigning ? <ActivityIndicator color="#052e16" /> : <Text style={s.secondaryBtnText}>Assign Lecturer</Text>}
          </TouchableOpacity>
        </PageSection>

        <PageSection title="Current Modules" subtitle="Clean list of modules under the selected faculty.">
          {!facultyModules.length ? (
            <EmptyState text="No modules found for this faculty." />
          ) : (
            facultyModules.map((item) => (
              <View key={item.id} style={s.listCard}>
                <Text style={s.code}>{getModuleCode(item)}</Text>
                <Text style={s.name}>{getModuleLabel(item)}</Text>
                <Text style={s.sub}>Course: {getCourseLabel(item)}</Text>
                <Text style={s.sub}>Lecturer: {item.lecturerName || 'Unassigned'}</Text>
                <Text style={s.sub}>Venue: {item.venue || 'TBA'} | Time: {item.scheduledTime || 'TBA'}</Text>
              </View>
            ))
          )}
        </PageSection>
      </ScrollView>
    </View>
  );
}

function ReportsTab({ data, selectedFacultyId, setSelectedFacultyId }) {
  const [filter, setFilter] = useState('all');
  const selectedFaculty = prospectusCatalog.find((item) => item.id === selectedFacultyId) || null;
  const reports = filterByFaculty(data.reports, selectedFaculty?.name).filter((item) => {
    if (filter === 'reviewed') return Boolean(item?.prlFeedback);
    if (filter === 'pending') return !item?.prlFeedback;
    return true;
  });

  return (
    <View style={s.screen}>
      <Header title="Reports" />
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.pad}
        ListHeaderComponent={
          <>
            <PageSection title="Report Filters" subtitle="Filter reports by faculty and PRL status.">
              <DropdownField label="Faculty" options={getFacultyOptions()} value={selectedFacultyId} onChange={setSelectedFacultyId} />
              <View style={s.filterRow}>
                {['all', 'reviewed', 'pending'].map((item) => (
                  <TouchableOpacity key={item} style={[s.filterPill, filter === item && s.filterPillActive]} onPress={() => setFilter(item)}>
                    <Text style={[s.filterText, filter === item && s.filterTextActive]}>
                      {item === 'all' ? 'All' : item === 'reviewed' ? 'Reviewed' : 'Pending'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </PageSection>
          </>
        }
        ListEmptyComponent={<EmptyState text="No reports found for this filter." />}
        renderItem={({ item }) => (
          <View style={s.listCard}>
            <Text style={s.code}>{getModuleCode(item)} | {item.week}</Text>
            <Text style={s.name}>{getModuleLabel(item)}</Text>
            <Text style={s.sub}>Faculty: {item.facultyName || 'Not set'}</Text>
            <Text style={s.sub}>Course: {getCourseLabel(item)}</Text>
            <Text style={s.sub}>Lecturer: {item.lecturerName || 'Unknown'}</Text>
            <Text style={s.sub}>Topic: {item.topic || 'Not captured'}</Text>
            <Text style={s.sub}>PRL Feedback: {item.prlFeedback || 'Pending feedback'}</Text>
          </View>
        )}
      />
    </View>
  );
}

function LecturesTab({ data, selectedFacultyId, setSelectedFacultyId }) {
  const selectedFaculty = prospectusCatalog.find((item) => item.id === selectedFacultyId) || null;
  const reports = filterByFaculty(data.reports, selectedFaculty?.name);

  return (
    <View style={s.screen}>
      <Header title="Lectures" />
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.pad}
        ListHeaderComponent={
          <PageSection title="Lecture Activity" subtitle="Latest lecture activity for the selected faculty.">
            <DropdownField label="Faculty" options={getFacultyOptions()} value={selectedFacultyId} onChange={setSelectedFacultyId} />
          </PageSection>
        }
        ListEmptyComponent={<EmptyState text="No lecture activity found for this faculty." />}
        renderItem={({ item }) => (
          <View style={s.listCard}>
            <Text style={s.code}>{item.lecturerName || 'Lecturer'}</Text>
            <Text style={s.name}>{getModuleLabel(item)}</Text>
            <Text style={s.sub}>Course: {getCourseLabel(item)}</Text>
            <Text style={s.sub}>Week: {item.week} | Date: {item.dateOfLecture || 'Pending'}</Text>
            <Text style={s.sub}>Topic: {item.topic || 'Not captured'}</Text>
          </View>
        )}
      />
    </View>
  );
}

function RatingTab({ selectedFacultyId, setSelectedFacultyId }) {
  const selectedFaculty = prospectusCatalog.find((item) => item.id === selectedFacultyId) || null;

  return (
    <View style={s.screen}>
      <Header title="Rating" />
      <ScrollView contentContainerStyle={s.pad}>
        <PageSection title="Faculty Rating" subtitle="Rate overall quality for the selected faculty.">
          <DropdownField label="Faculty" options={getFacultyOptions()} value={selectedFacultyId} onChange={setSelectedFacultyId} />
          <RatingWidget
            targetId={selectedFaculty?.id || 'pl-faculty'}
            targetName={selectedFaculty?.name || 'Faculty Quality'}
            context="pl-rating"
          />
        </PageSection>
      </ScrollView>
    </View>
  );
}

export default function PLScreen() {
  const { profile, user } = useAuth();
  const data = usePLData();
  const [selectedFacultyId, setSelectedFacultyId] = useState(prospectusCatalog[0]?.id || null);
  const profileName = profile?.name || user?.displayName || 'Program Leader';

  if (data.loading && !data.classes.length && !data.reports.length && !data.users.length) {
    return (
      <View style={s.loadingScreen}>
        <ActivityIndicator color="#22c55e" size="large" />
        <Text style={s.loadingText}>Loading program dashboard...</Text>
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#22c55e',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Dashboard: focused ? 'view-dashboard' : 'view-dashboard-outline',
            Modules: focused ? 'book-plus' : 'book-plus-outline',
            Reports: focused ? 'file-chart' : 'file-chart-outline',
            Lectures: focused ? 'presentation' : 'presentation-play',
            Rating: focused ? 'star' : 'star-outline',
          };
          return <MaterialCommunityIcons name={icons[route.name] || 'circle-outline'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard">
        {() => <DashboardTab profileName={profileName} data={data} selectedFacultyId={selectedFacultyId} setSelectedFacultyId={setSelectedFacultyId} />}
      </Tab.Screen>
      <Tab.Screen name="Modules">
        {() => <ModulesTab data={data} selectedFacultyId={selectedFacultyId} setSelectedFacultyId={setSelectedFacultyId} refresh={data.refresh} />}
      </Tab.Screen>
      <Tab.Screen name="Reports">
        {() => <ReportsTab data={data} selectedFacultyId={selectedFacultyId} setSelectedFacultyId={setSelectedFacultyId} />}
      </Tab.Screen>
      <Tab.Screen name="Lectures">
        {() => <LecturesTab data={data} selectedFacultyId={selectedFacultyId} setSelectedFacultyId={setSelectedFacultyId} />}
      </Tab.Screen>
      <Tab.Screen name="Rating">
        {() => <RatingTab selectedFacultyId={selectedFacultyId} setSelectedFacultyId={setSelectedFacultyId} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f172a' },
  pad: { padding: 16 },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  loadingText: { color: '#94a3b8', marginTop: 12 },
  listCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 10,
  },
  code: { color: '#22c55e', fontWeight: '700', fontSize: 13, marginBottom: 4 },
  name: { color: '#f8fafc', fontWeight: '700', fontSize: 15, marginBottom: 4 },
  sub: { color: '#94a3b8', fontSize: 12, marginBottom: 2 },
  input: {
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  primaryBtn: { backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#052e16', fontWeight: '800' },
  secondaryBtn: { backgroundColor: '#bbf7d0', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  secondaryBtnText: { color: '#052e16', fontWeight: '800' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  filterPill: { backgroundColor: '#0f172a', borderColor: '#334155', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterPillActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  filterText: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: '#052e16' },
});

const styles = StyleSheet.create({
  tabBar: { backgroundColor: '#111827', borderTopColor: '#1f2937', borderTopWidth: 1, height: 68, paddingBottom: 6, paddingTop: 6 },
});
