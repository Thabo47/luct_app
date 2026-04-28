import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView,
  TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { CoursePicker, OptionPicker } from '../sharedComponents/SharedComponents';
import { findCourseByName, prospectusCatalog } from '../prospectusData';
import { getCourseMeta, saveCourseMeta, submitReport } from '../backend/firebase/firestore';

const WEEKS = Array.from({ length: 14 }, (_, i) => `Week ${i + 1}`);

export default function ReportFormFields({ selectedClass = null }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [facultyName, setFacultyName] = useState('');
  const [className, setClassName] = useState('');
  const [moduleCode, setModuleCode] = useState('');
  const [week, setWeek] = useState('Week 1');
  const [dateOfLecture, setDateOfLecture] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [lecturerName, setLecturerName] = useState('');
  const [studentsPresent, setStudentsPresent] = useState('');
  const [totalStudents, setTotalStudents] = useState('');
  const [venue, setVenue] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [topic, setTopic] = useState('');
  const [outcomes, setOutcomes] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState(prospectusCatalog[0]?.id || null);

  useEffect(() => {
    if (!selectedClass) {
      setFacultyName(profile?.facultyName || '');
      setClassName('');
      setModuleCode('');
      setLecturerName(profile?.name || '');
      return;
    }

    setFacultyName(selectedClass.facultyName || profile?.facultyName || '');
    setClassName(selectedClass.className || selectedClass.moduleName || selectedClass.courseName || '');
    setModuleCode(selectedClass.moduleCode || '');
    setCourseName(selectedClass.courseName || '');
    setCourseCode(selectedClass.courseCode || '');
    setLecturerName(selectedClass.lecturerName || profile?.name || '');
    setVenue(selectedClass.venue || '');
    setSchedTime(selectedClass.scheduledTime || '');
  }, [selectedClass, profile?.facultyName, profile?.name]);

  useEffect(() => {
    const matchedFaculty = prospectusCatalog.find((faculty) => faculty.id === selectedFacultyId) || null;
    if (matchedFaculty && facultyName !== matchedFaculty.name) {
      setFacultyName(matchedFaculty.name);
    }
  }, [selectedFacultyId, facultyName]);

  useEffect(() => {
    if (!courseName) return;
    const match = findCourseByName(courseName);
    if (!match) return;
    setSelectedFacultyId(match.faculty.id);
    setFacultyName(match.faculty.name);
    if (!courseCode && match.course.code) {
      setCourseCode(match.course.code);
    }
  }, [courseName, courseCode]);

  useEffect(() => {
    if (!courseCode.trim()) return;
    const fetchTotal = async () => {
      setLoading(true);
      try {
        const meta = await getCourseMeta(courseCode);
        if (meta?.totalStudents !== undefined) setTotalStudents(String(meta.totalStudents));
      } catch {}
      setLoading(false);
    };
    fetchTotal();
  }, [courseCode]);

  async function handleSubmit() {
    if (!facultyName || !className || !courseName || !courseCode || !lecturerName || !venue || !schedTime || !topic || !dateOfLecture) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    if (!user?.uid) {
      Alert.alert('Authentication required', 'Please sign in again before submitting a report.');
      return;
    }
    if (studentsPresent && Number.isNaN(Number(studentsPresent))) {
      Alert.alert('Invalid attendance', 'Actual students present must be a number.');
      return;
    }
    if (totalStudents && Number.isNaN(Number(totalStudents))) {
      Alert.alert('Invalid attendance', 'Total registered students must be a number.');
      return;
    }
    setSaving(true);
    try {
      if (totalStudents) {
        await saveCourseMeta(courseCode, {
          totalStudents: Number(totalStudents),
        });
      }

      await submitReport({
        facultyName, className, week, dateOfLecture,
        moduleCode: moduleCode || null,
        courseName, courseCode: courseCode.toUpperCase(),
        lecturerName, studentsPresent: Number(studentsPresent),
        totalStudents: Number(totalStudents),
        venue,
        schedTime,
        scheduledLectureTime: schedTime,
        topic,
        outcomes,
        learningOutcomes: outcomes,
        recommendations,
        submittedBy: user.uid,
      });

      Alert.alert('Success', 'Report submitted successfully!');
      setTopic('');
      setOutcomes('');
      setRecommendations('');
      setStudentsPresent('');
      setDateOfLecture('');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Lecturer Reporting Form</Text>

      <OptionPicker
        title="Prospectus Faculties"
        options={prospectusCatalog.map((faculty) => ({
          value: faculty.id,
          label: faculty.name,
        }))}
        selectedValue={selectedFacultyId}
        onSelect={(option) => {
          const faculty = prospectusCatalog.find((item) => item.id === option.value) || null;
          setSelectedFacultyId(faculty?.id || null);
          setFacultyName(faculty?.name || '');
          if (faculty?.courses?.length) {
            setCourseName(faculty.courses[0].name);
            setCourseCode(faculty.courses[0].code || '');
          }
        }}
        emptyText="No prospectus faculties are loaded."
      />
      <Field label="Faculty Name *" value={facultyName} onChangeText={setFacultyName} />
      <Field label="Course Name *" value={courseName} onChangeText={setCourseName} />
      <Field label="Course Code *" value={courseCode} onChangeText={setCourseCode} autoCapitalize="characters" />
      <Field label="Module / Class Name *" value={className} onChangeText={setClassName} />
      <Field label="Module Code" value={moduleCode} onChangeText={setModuleCode} autoCapitalize="characters" />

      <Text style={styles.label}>Week of Reporting</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekRow}>
        {WEEKS.map((w) => (
          <TouchableOpacity key={w} style={[styles.weekBtn, week === w && styles.weekBtnActive]}
            onPress={() => setWeek(w)}>
            <Text style={[styles.weekTxt, week === w && styles.weekTxtActive]}>{w}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Field label="Date of Lecture (YYYY-MM-DD) *" value={dateOfLecture} onChangeText={setDateOfLecture} placeholder="2025-03-18" />
      <CoursePicker
        title="Prospectus Courses"
        courses={(prospectusCatalog.find((faculty) => faculty.id === selectedFacultyId)?.courses || []).map((course) => ({
          id: course.id,
          courseCode: course.code || course.name,
          courseName: course.name,
        }))}
        selectedCourseCode={courseCode || null}
        onSelect={(item) => {
          const faculty = prospectusCatalog.find((entry) => entry.id === selectedFacultyId);
          const course = faculty?.courses.find((entry) => entry.id === item.id) || null;
          setCourseName(course?.name || '');
          setCourseCode(course?.code || '');
          setFacultyName(faculty?.name || facultyName);
        }}
        emptyText="No prospectus courses are loaded for this faculty."
      />
      <Field label="Lecturer's Name *" value={lecturerName} onChangeText={setLecturerName} />
      <Field label="Actual Students Present *" value={studentsPresent} onChangeText={setStudentsPresent} keyboardType="numeric" />

      <Text style={styles.label}>Total Registered Students</Text>
      <View style={styles.autoRow}>
        <TextInput style={[styles.input, { flex: 1 }]} value={totalStudents}
          onChangeText={setTotalStudents} keyboardType="numeric" placeholderTextColor="#64748b"
          placeholder="Auto-filled from course code" />
        {loading && <ActivityIndicator color="#6366f1" style={{ marginLeft: 8 }} />}
      </View>

      <Field label="Venue *" value={venue} onChangeText={setVenue} />
      <Field label="Scheduled Lecture Time *" value={schedTime} onChangeText={setSchedTime} placeholder="08:00 - 10:00" />
      <Field label="Topic Taught *" value={topic} onChangeText={setTopic} />
      <Field label="Learning Outcomes" value={outcomes} onChangeText={setOutcomes} multiline />
      <Field label="Lecturer's Recommendations" value={recommendations} onChangeText={setRecommendations} multiline />

      <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>Submit Report</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, multiline, ...props }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, multiline && styles.multiline]}
        placeholderTextColor="#64748b" multiline={multiline}
        numberOfLines={multiline ? 4 : 1} {...props} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { color: '#f1f5f9', fontSize: 20, fontWeight: '700', marginBottom: 20 },
  label: { color: '#94a3b8', fontSize: 13, marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: '#1e293b',
    color: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  autoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  weekRow: { marginBottom: 14 },
  weekBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  weekBtnActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  weekTxt: { color: '#64748b', fontSize: 12 },
  weekTxtActive: { color: '#fff', fontWeight: '600' },
  btn: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
