/* eslint-disable prettier/prettier */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native';
import AppHeader from "../widgets/AppHeader";
import tmh_styles from '../styles/tmh_styles';

const Payment = ({ navigation }) => {
  const [selectedMethod, setSelectedMethod] = useState('Credit Card');
  const totalAmount = 1500;

  const paymentMethods = [
    {
      name: 'Credit Card',
      icon: require('../resources/images/creditcard.png'),
    },
    {
      name: 'PayPal',
      icon: require('../resources/images/paypal.png'),
    },
    {
      name: 'Google Pay',
      icon: require('../resources/assets/google.png'),
    },
    {
      name: 'Pay Fast',
      icon: require('../resources/images/payfast.png'),
    },
  ];
const handleConfirm = () => {
  if (!selectedMethod) {
    Alert.alert("Error", "Please select a payment method");
    return;
  }

  // Simulating success/failure randomly for now
  const isSuccess = Math.random() > 0.5;

  navigation.navigate("PaymentStatus", {
    status: isSuccess ? "success" : "failed",
  });
};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1c1c1c' }}>
      <AppHeader
              title="Payment"
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
        <Text style={styles.sectionTitle}>Choose Payment Method</Text>

        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.name}
            style={styles.methodRow}
            onPress={() => setSelectedMethod(method.name)}
          >
            <View style={styles.methodInfo}>
              <Image source={method.icon} style={styles.icon} />
              <Text style={styles.methodText}>{method.name}</Text>
            </View>
            <View
              style={[
                styles.radioOuter,
                selectedMethod === method.name && styles.radioOuterSelected,
              ]}
            >
              {selectedMethod === method.name && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}

        {/* Add Card Button */}
        <TouchableOpacity style={styles.addCardButton}  onPress={() => navigation.navigate("CardInfo")}>
          <Text style={styles.addCardText}>+ Card</Text>
        </TouchableOpacity>

        {/* Confirm Button */}
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default Payment;

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#c99742',
    padding: 16,
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    color: '#fff',
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  icon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#c99742',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#c99742',
  },
  addCardButton: {
    backgroundColor: '#111',
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  addCardText: {
    color: '#fff',
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#c99742',
    padding: 16,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  confirmText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
  },
});
