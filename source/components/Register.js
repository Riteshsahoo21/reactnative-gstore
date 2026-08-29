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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { API_BASE } from "../resources/data/Constants";

const Register = ({ navigation }) => {
  const [title, setTitle] = useState('Mr');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !mobileNumber || !password || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const queryParams = new URLSearchParams({
        title,
        fname: firstName,
        lname: lastName, // ✅ use 'Iname' if backend expects it that way
        email,
        phone: mobileNumber,
        password,
        cpassword: confirmPassword,
      }).toString();

      const url = `http://grandstore.co.za/api/register?${queryParams}`;
      console.log('Requesting:', url);

      const response = await fetch(url, {
        method: 'post',
      });

      const status = response.status;
      const text = await response.text();
      console.log('Status:', status);
      console.log('Raw response:', text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn('Failed to parse JSON:', e);
      }

      if (response.ok && data?.status === true) {
        Alert.alert('Success', 'Registered successfully!');
        navigation.navigate('LoginScreen');
      } else {
        Alert.alert('Registration Failed', data?.message || `Server returned status ${status}`);
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Register</Text>

        {/* Title Picker */}
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Title</Text>
          <Picker
            selectedValue={title}
            onValueChange={(itemValue) => setTitle(itemValue)}
            style={styles.picker}
            dropdownIconColor="#090909ff"
          >
            <Picker.Item label="Mr" value="Mr" />
            <Picker.Item label="Mrs" value="Mrs" />
            <Picker.Item label="Ms" value="Ms" />
            <Picker.Item label="Dr" value="Dr" />
            <Picker.Item label="Prof" value="Prof" />
          </Picker>
        </View>

        <TextInput
          style={styles.input}
          placeholder="First Name"
          placeholderTextColor="#888"
          onChangeText={setFirstName}
          value={firstName}
        />

        <TextInput
          style={styles.input}
          placeholder="Last Name"
          placeholderTextColor="#888"
          onChangeText={setLastName}
          value={lastName}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          onChangeText={setEmail}
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Mobile Number"
          placeholderTextColor="#888"
          onChangeText={setMobileNumber}
          value={mobileNumber}
          keyboardType="number-pad"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          onChangeText={setPassword}
          value={password}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#888"
          onChangeText={setConfirmPassword}
          value={confirmPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? 'Registering...' : 'Register'}
          </Text>
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
            <Text style={styles.loginLink}> Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#0d0d0d',
  },
  title: {
    fontSize: 38,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#b18d33ff',
  },
  input: {
    borderWidth: 1,
    backgroundColor: '#1c1c1c',
    padding: 12,
    marginVertical: 10,
    borderRadius: 8,
    color: '#fff',
    borderColor: '#333',
  },
  pickerContainer: {
    marginBottom: 10,
  },
  pickerLabel: {
    color: '#fff',
    marginBottom: 5,
    marginLeft: 5,
  },
  picker: {
    backgroundColor: '#1c1c1c',
    color: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: '#b4840cff',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: '#1c1c1c',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 20,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
  },
  loginText: {
    color: '#aaa',
    fontSize: 14,
  },
  loginLink: {
    color: '#f5c242',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
