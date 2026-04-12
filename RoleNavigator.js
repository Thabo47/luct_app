import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from './AuthContext';
import StudentScreen from './StudentScreen';
import LecturerScreen from './LecturerScreen';
import PRLScreen from './PRLScreen';
import PLScreen from './PLScreen';

export default function RoleNavigator() {
  const { role, authError } = useAuth();

  switch (role) {
    case 'student':   return <StudentScreen />;
    case 'lecturer':  return <LecturerScreen />;
    case 'prl':       return <PRLScreen />;
    case 'pl':        return <PLScreen />;
    default:
      return (
        <View style={styles.center}>
          {authError ? <Text style={styles.error}>{authError}</Text> : null}
          <Text style={styles.text}>No role assigned. Contact your administrator.</Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  error:  { color: '#fca5a5', fontSize: 14, textAlign: 'center', paddingHorizontal: 32, marginBottom: 12 },
  text:   { color: '#94a3b8', fontSize: 15, textAlign: 'center', paddingHorizontal: 32 },
});
