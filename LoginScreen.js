import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import { CoursePicker, OptionPicker } from './SharedComponents';
import { prospectusCatalog } from './ProspectusData';

const ROLES = ['student', 'lecturer', 'prl', 'pl'];

export default function LoginScreen({ initialError = null }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]       = useState('');
  const [role, setRole]       = useState('student');
  const [selectedFacultyId, setSelectedFacultyId] = useState(prospectusCatalog[0]?.id || null);
  const [selectedCourseId, setSelectedCourseId] = useState(prospectusCatalog[0]?.courses?.[0]?.id || null);
  const [loading, setLoading] = useState(false);
  const { authError, login, register } = useAuth();

  const selectedFaculty = prospectusCatalog.find((faculty) => faculty.id === selectedFacultyId) || null;
  const selectedCourse = selectedFaculty?.courses.find((course) => course.id === selectedCourseId) || null;
  const requiresFaculty = role === 'student' || role === 'prl' || role === 'pl';
  const requiresCourse = role === 'student' || role === 'prl' || role === 'pl';
  const facultyTitle =
    role === 'student'
      ? 'Student Faculty'
      : role === 'prl'
        ? 'PRL Faculty Scope'
        : 'PL Faculty Scope';
  const courseTitle =
    role === 'student'
      ? 'Student Course'
      : role === 'prl'
        ? 'PRL Stream / Course'
        : 'PL Program / Course';

  async function handleLogin() {
    if (!email || !password) { Alert.alert('Fill in all fields'); return; }
    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      Alert.alert('Login failed', e.message);
    }
    setLoading(false);
  }

  async function handleRegister() {
    if (!email || !password || !name) { Alert.alert('Fill in all fields'); return; }
    if (requiresFaculty && !selectedFaculty) {
      Alert.alert('Select faculty details', 'Choose the faculty before registering this role.');
      return;
    }
    if (requiresCourse && !selectedCourse) {
      Alert.alert('Select course details', 'Choose the course before registering this role.');
      return;
    }
    setLoading(true);
    try {
      await register({
        email,
        password,
        name,
        role,
        facultyName: requiresFaculty ? selectedFaculty?.name || null : null,
        courseName: requiresCourse ? selectedCourse?.name || null : null,
        courseCode: requiresCourse ? selectedCourse?.code || null : null,
      });
    } catch (e) {
      Alert.alert('Registration failed', e.message);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <View style={styles.heroRow}>
          <View style={styles.heroBadge}>
            <MaterialCommunityIcons name="school-outline" size={24} color="#dbeafe" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.kicker}>Lecture Monitoring Platform</Text>
            <Text style={styles.title}>LUCT Reporter</Text>
            <Text style={styles.subtitle}>{isRegister ? 'Create account' : 'Sign in to continue'}</Text>
          </View>
        </View>
        {initialError || authError ? <Text style={styles.error}>{initialError || authError}</Text> : null}

        {isRegister && (
          <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#64748b"
            value={name} onChangeText={setName} />
        )}

        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#64748b"
          value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

        <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#64748b"
          value={password} onChangeText={setPassword} secureTextEntry />

        {isRegister && (
          <>
            <Text style={styles.label}>Role</Text>
            <View style={styles.roleRow}>
              {ROLES.map(r => (
                <TouchableOpacity key={r} style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                  onPress={() => setRole(r)}>
                  <Text style={[styles.roleTxt, role === r && styles.roleTxtActive]}>
                    {r.toUpperCase()}
                  </Text>
                  <Text style={[styles.roleSub, role === r && styles.roleSubActive]}>
                    {r === 'student' ? 'Track attendance' : r === 'lecturer' ? 'Submit reports' : r === 'prl' ? 'Review stream' : 'Manage program'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {requiresFaculty ? (
              <>
                <OptionPicker
                  title={facultyTitle}
                  options={prospectusCatalog.map((faculty) => ({
                    value: faculty.id,
                    label: faculty.name,
                  }))}
                  selectedValue={selectedFacultyId}
                  onSelect={(option) => {
                    const faculty = prospectusCatalog.find((item) => item.id === option.value) || null;
                    setSelectedFacultyId(faculty?.id || null);
                    setSelectedCourseId(faculty?.courses?.[0]?.id || null);
                  }}
                  emptyText="No faculties are loaded."
                />
                {requiresCourse ? (
                  <CoursePicker
                    title={courseTitle}
                    courses={(selectedFaculty?.courses || []).map((course) => ({
                      id: course.id,
                      courseCode: course.code || course.name,
                      courseName: course.name,
                    }))}
                    selectedCourseCode={selectedCourse?.code || null}
                    onSelect={(item) => setSelectedCourseId(item.id)}
                    emptyText="No courses are loaded for this faculty."
                  />
                ) : null}
              </>
            ) : null}
          </>
        )}

        <TouchableOpacity style={styles.btn} onPress={isRegister ? handleRegister : handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.btnTxt}>{isRegister ? 'Register' : 'Login'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
          <Text style={styles.toggle}>
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', paddingHorizontal: 24 },
  card:         { backgroundColor: '#111827', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: '#1f2937' },
  heroRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  heroBadge:    { width: 54, height: 54, borderRadius: 18, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  heroText:     { flex: 1 },
  kicker:       { color: '#60a5fa', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  title:        { color: '#f8fafc', fontSize: 28, fontWeight: '800', marginTop: 4, marginBottom: 2 },
  subtitle:     { color: '#94a3b8', fontSize: 14 },
  input:        { backgroundColor: '#0f172a', color: '#f1f5f9', borderRadius: 10, paddingHorizontal: 16,
                  paddingVertical: 13, marginBottom: 14, fontSize: 15, borderWidth: 1, borderColor: '#334155' },
  label:        { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
  roleRow:      { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  roleBtn:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
                  backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', minWidth: '47%' },
  roleBtnActive:{ backgroundColor: '#6366f1', borderColor: '#6366f1' },
  roleTxt:      { color: '#64748b', fontSize: 12, fontWeight: '600' },
  roleTxtActive:{ color: '#fff' },
  roleSub:      { color: '#475569', fontSize: 11, marginTop: 4 },
  roleSubActive:{ color: '#dbeafe' },
  btn:          { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  btnTxt:       { color: '#fff', fontWeight: '700', fontSize: 16 },
  toggle:       { color: '#93c5fd', textAlign: 'center', marginTop: 18, fontSize: 13, fontWeight: '600' },
  error:        { color: '#fca5a5', textAlign: 'center', marginBottom: 16, fontSize: 13 },
});
