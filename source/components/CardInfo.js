/* eslint-disable prettier/prettier */
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import AppHeader from "../widgets/AppHeader";
import tmh_styles from '../styles/tmh_styles';

const CardInfo = ({ navigation }) => {
  const [fullName, setFullName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const handleSave = () => {
    if (!fullName || !cardNumber || !expiry || !cvv) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    if (cardNumber.length < 12) {
      Alert.alert("Invalid Card", "Card number must be at least 12 digits");
      return;
    }

    if (cvv.length < 3) {
      Alert.alert("Invalid CVV", "CVV must be 3 digits");
      return;
    }

    Alert.alert("Success", "Card information saved successfully!", [
      {
        text: "OK",
        onPress: () => navigation?.goBack(),
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#1d1d1d" }}>
      {/* Header */}
       <AppHeader
        title="Card Information"
        isGradient={false}
        backgroundColor="#c99742"
        titleStyle={tmh_styles.header_title_tmb}
        isShowShadow={true}
        isBack={true}
        backButtonStyle={{ width: 35, height: 25, alignItems: "center" }}
        backIconColor="black"
        logoImage={null}
        navigation={navigation}       
        />

      <View style={styles.container}>
        <Text style={styles.cardTitle}>Visa Card</Text>

        {/* Full Name */}
        <Text style={styles.label}>Full Name*</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Card Holder Name"
          placeholderTextColor="#aaa"
          value={fullName}
          onChangeText={setFullName}
        />

        {/* Card Number */}
        <Text style={styles.label}>Number*</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Card Number"
          placeholderTextColor="#aaa"
          keyboardType="numeric"
          maxLength={16}
          value={cardNumber}
          onChangeText={setCardNumber}
        />

        {/* Expiry */}
        <Text style={styles.label}>Expire Date</Text>
        <TextInput
          style={styles.input}
          placeholder="MM/YY"
          placeholderTextColor="#aaa"
          keyboardType="numeric"
          maxLength={5}
          value={expiry}
          onChangeText={setExpiry}
        />

        {/* CVV */}
        <Text style={styles.label}>CVV</Text>
        <TextInput
          style={styles.input}
          placeholder="123"
          placeholderTextColor="#aaa"
          keyboardType="numeric"
          secureTextEntry
          maxLength={3}
          value={cvv}
          onChangeText={setCvv}
        />

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default CardInfo;

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#c99742",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  backArrow: {
    fontSize: 20,
    color: "#000",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: "#c99742",
    padding: 16,
    borderRadius: 10,
    marginTop: 30,
    alignItems: "center",
  },
  saveText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
});
