/* eslint-disable prettier/prettier */
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Colors from '../resources/colors/Colors';
import { APP_FONT } from '../resources/data/Fonts';

const Profile = () => {
  const[isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [joindate, setJoindate] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [profilePic, setProfilePic] = useState([]);

  const selectProfilePic = () => {
    launchImageLibrary({}, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else {
        const source = { uri: response.uri };
        setProfilePic(source);
      }
    });
  };

  const saveProfile = () => {

    setIsEditing(!isEditing);
  };
  const editProfile = () => {

    setIsEditing(!isEditing);
  };
    return (
    <View style={styles.container}>
      <TouchableOpacity onPress={selectProfilePic}>
        <Image
          source={
            profilePic && profilePic.uri
              ? { uri: profilePic.uri }
              : require('../resources/images/sommelier_crest.jpg')
          }
          style={styles.profilePic}
        />
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
        placeholderTextColor={Colors.placeholder_color_tmb}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        placeholderTextColor={Colors.placeholder_color_tmb}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone"
        value={phone}
        onChangeText={setPhone}
        placeholderTextColor={Colors.placeholder_color_tmb}
      />
       <TextInput
        style={styles.input}
        placeholder="Join date"
        value={joindate}
        onChangeText={setJoindate}
        placeholderTextColor={Colors.placeholder_color_tmb}
      />
      <TextInput
        style={styles.input}
        placeholder="Address"
        value={address}
        onChangeText={setAddress}
        placeholderTextColor={Colors.placeholder_color_tmb}
      />
      <TextInput
        style={styles.input}
        placeholder="City"
        value={city}
        onChangeText={setCity}
        placeholderTextColor={Colors.placeholder_color_tmb}
      />
      <TextInput
        style={styles.input}
        placeholder="Country"
        value={country}
        onChangeText={setCountry}
        placeholderTextColor={Colors.placeholder_color_tmb}
      />

{!isEditing ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={editProfile}>
              <Text style={styles.buttonText}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveProfile}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#c99742',
  },
  profilePicPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: Colors.input_border2_color,
    marginBottom: 16,
  },
  input: {
    width: '80%',
    padding: 8,
    marginVertical: 8,
    borderBottomWidth: 1,
    borderColor: Colors.input_border2_color,
    fontSize: 20,
    color:Colors.black_tmb
  },
  saveButton: {
    backgroundColor: 'red',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 20,
    width: '90%',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontFamily: APP_FONT,
    fontSize: 16,
    textAlign: 'center',
  },
  editButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 20,
    width: '90%',
    marginBottom: 20,
  },
});

export default Profile;
