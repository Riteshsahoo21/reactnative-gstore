/* eslint-disable prettier/prettier */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import { API_BASE } from '../resources/data/Constants';

const Register = ({ navigation }) => {
  const [title, setTitle] = useState('Mr');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(true);
  const [loading, setLoading] = useState(false);

  const postRegisterEndpoint = async (payload) => {
    const candidates = [
      `${API_BASE}/auth/register`,
      'http://localhost:5000/api/auth/register',
      'http://127.0.0.1:5000/api/auth/register',
      'http://10.0.2.2:5000/api/auth/register',
      'http://192.168.1.9:5000/api/auth/register',
    ];
    const uniqueCandidates = [...new Set(candidates)];
    let lastError = null;

    for (const url of uniqueCandidates) {
      try {
        const res = await axios.post(url, payload, {
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          timeout: 3500,
          _skipRewrite: true,
        });
        if (res && res.data) {
          setActiveApiBase('http://localhost:5000/api');
          return res.data;
        }
      } catch (err) {
        lastError = err;
        if (err.response?.data?.message) {
          throw new Error(err.response.data.message);
        }
      }
    }
    throw new Error(lastError?.message || 'Unable to connect to registration server. Please check your connection.');
  };

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing Information', 'Please complete all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match. Please re-enter.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password Requirement', 'Password must be at least 6 characters long.');
      return;
    }

    if (!isAgeConfirmed) {
      Alert.alert('Age Verification', 'You must be 18 years or older to register an account.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: `${title} ${firstName.trim()} ${lastName.trim()}`.trim(),
        email: email.trim().toLowerCase(),
        phone: mobileNumber.trim(),
        password: password.trim(),
      };

      const response = await postRegisterEndpoint(payload);

      Alert.alert(
        'Registration Received',
        response.message || 'Your account has been created. Please sign in to access your vault.',
        [
          {
            text: 'Sign In Now',
            onPress: () => navigation.navigate('LoginScreen'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Registration Failed', error.message || 'Could not complete registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandHeader}>
          <Text style={styles.brandCrest}>THE GRAND STORE</Text>
          <Text style={styles.title}>Create Patron Account</Text>
          <Text style={styles.subtitle}>
            Register for private cellar reserves, member allocations, and auction privileges.
          </Text>
        </View>

        <View style={styles.card}>
          {/* Title Picker */}
          <Text style={styles.fieldLabel}>TITLE</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={title}
              onValueChange={(itemValue) => setTitle(itemValue)}
              style={styles.picker}
              dropdownIconColor="#c99742"
            >
              <Picker.Item label="Mr" value="Mr" />
              <Picker.Item label="Mrs" value="Mrs" />
              <Picker.Item label="Ms" value="Ms" />
              <Picker.Item label="Dr" value="Dr" />
              <Picker.Item label="Prof" value="Prof" />
            </Picker>
          </View>

          <Text style={styles.fieldLabel}>FIRST NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. John"
            placeholderTextColor="#666"
            onChangeText={setFirstName}
            value={firstName}
          />

          <Text style={styles.fieldLabel}>LAST NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Smith"
            placeholderTextColor="#666"
            onChangeText={setLastName}
            value={lastName}
          />

          <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.input}
            placeholder="patron@domain.co.za"
            placeholderTextColor="#666"
            onChangeText={setEmail}
            value={email}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.fieldLabel}>MOBILE PHONE (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            placeholder="+27 82 123 4567"
            placeholderTextColor="#666"
            onChangeText={setMobileNumber}
            value={mobileNumber}
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="Minimum 6 characters"
            placeholderTextColor="#666"
            onChangeText={setPassword}
            value={password}
            secureTextEntry
          />

          <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="Repeat password"
            placeholderTextColor="#666"
            onChangeText={setConfirmPassword}
            value={confirmPassword}
            secureTextEntry
          />

          {/* 18+ Age Verification */}
          <TouchableOpacity
            style={styles.ageRow}
            activeOpacity={0.7}
            onPress={() => setIsAgeConfirmed(!isAgeConfirmed)}
          >
            <View style={[styles.checkbox, isAgeConfirmed && styles.checkboxActive]}>
              {isAgeConfirmed && <Text style={styles.checkText}>✓</Text>}
            </View>
            <Text style={styles.ageLabel}>
              I confirm I am <Text style={styles.goldText}>18 years or older</Text> as legally required by the South African Liquor Act.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#f5c242', '#c99742', '#a67c2e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#111" />
              ) : (
                <Text style={styles.btnText}>REGISTER ACCOUNT →</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already registered? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
            <Text style={styles.loginLink}>Sign In Here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Register;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080706',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 40,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brandCrest: {
    color: '#c99742',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: '#9e968a',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#0f0d0b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    marginBottom: 20,
  },
  fieldLabel: {
    color: '#b0976d',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#15120e',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    color: '#fff',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  pickerContainer: {
    backgroundColor: '#15120e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 14,
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
    backgroundColor: '#15120e',
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201, 151, 66, 0.07)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(201, 151, 66, 0.2)',
    marginBottom: 18,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 151, 66, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#111',
  },
  checkboxActive: {
    backgroundColor: '#c99742',
    borderColor: '#f5c242',
  },
  checkText: {
    color: '#111',
    fontSize: 12,
    fontWeight: '900',
  },
  ageLabel: {
    flex: 1,
    color: '#ccc',
    fontSize: 11.5,
    lineHeight: 16,
  },
  goldText: {
    color: '#f5c242',
    fontWeight: '800',
  },
  submitBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 6,
  },
  btnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#0d0b08',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  loginText: {
    color: '#888',
    fontSize: 13,
  },
  loginLink: {
    color: '#f5c242',
    fontWeight: '800',
    fontSize: 13,
  },
});
