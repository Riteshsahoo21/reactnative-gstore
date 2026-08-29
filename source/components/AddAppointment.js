/* eslint-disable react-native/no-inline-styles */
/* eslint-disable comma-dangle */
/* eslint-disable prettier/prettier */
import React, { useState } from 'react';
import { Image, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, Modal } from 'react-native';
import DatePicker from 'react-native-modern-datepicker';
import Colors from '../resources/colors/Colors';

const AddAppointment = () => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [open, setOpen] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState(null);
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);


  const handleDateChange = (selectedDate) => {
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const onChangeTime = (selectedTime) => {
    setTime(selectedTime);
    setShowTimePicker(false);
    Keyboard.dismiss();
  };

  const handleSubmit = () => {
    if (!name || !age || !email || !phoneNumber || !date || !time) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    console.log('details:', name, phoneNumber, age, email);
    console.log('Appointment Date:', date);
    console.log('Appointment Time:', time);
    setName('');
    setPhoneNumber('');
    setAge('');
    setEmail('');
    setDate('');
    setTime('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Book an Appointment</Text>
      <TextInput
        placeholder="Patient Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholderTextColor={Colors.input_border1_color}
      />
      <TextInput
        placeholder="Mobile number"
        value={phoneNumber}
        style={styles.input}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        placeholderTextColor={Colors.input_border1_color}
      />
      <TextInput
        placeholder="Age"
        value={age}
        onChangeText={setAge}
        style={styles.input}
        keyboardType="numeric"
        placeholderTextColor={Colors.input_border1_color}
      />
      <TextInput
        placeholder="Email id"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        placeholderTextColor={Colors.input_border1_color}
      />
      <View style={styles.dateInputWrapper}>
        <TextInput
          placeholder="Select Date"
          value={dateOfBirth}
          editable={false}
          style={styles.dateInput}
          placeholderTextColor={Colors.input_border1_color}
        />
        <TouchableOpacity onPress={() => setOpen(true)}>
          <Image
            style={styles.icon}
            source={require('../resources/images/calender.png')}
          />
        </TouchableOpacity>
        <Modal
          transparent={true}
          animationType="slide"
          visible={open}
          onRequestClose={() => setOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <DatePicker
                mode="calendar"
                selected={dateOfBirth}
                onDateChange={(date) => {
                  setOpen(false);
                  handleDateChange(date);
                }}
              />
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
      <View style={styles.dateInputWrapper}>
        <TextInput
          placeholder="Select Time"
          value={time}
          editable={false}
          style={styles.dateInput}
          placeholderTextColor={Colors.input_border1_color}
        />
        <TouchableOpacity onPress={() => setShowTimePicker(true)}>
          <Image
            style={styles.icon}
            source={require('../resources/images/clock.png')}
          />
        </TouchableOpacity>
        <Modal
          transparent={true}
          animationType="slide"
          visible={showTimePicker}
          onRequestClose={() => setShowTimePicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <DatePicker
                mode="time"
                onTimeChange={onChangeTime}
                options={{
                  mainColor: '#4CAF50',
                }}
              />
            </View>
          </View>
        </Modal>
      </View>
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Book Appointment</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: Colors.white_tmb,
  },
  input: {
    height: 40,
    borderColor: Colors.input_border1_color,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
    backgroundColor: '#fff',
    color: Colors.black_tmb,
  },
  submitButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  dateInputWrapper: {
    borderWidth: 1,
    borderColor: Colors.input_border1_color,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 5,
    justifyContent: 'center',
  },
  dateInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
    color: Colors.black_tmb,
  },
  icon: {
    width: 25,
    height: 25,
    marginHorizontal: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 10,
  },
  closeButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: Colors.white_tmb,
    fontSize: 16,
  },
});

export default AddAppointment;
