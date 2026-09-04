/* eslint-disable react-native/no-inline-styles */
/* eslint-disable prettier/prettier */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity } from 'react-native';
import vector from '../../resources/assets/Vector-3.png';
import back from '../../resources/assets/back.png';

const Payment = ({ route, navigation, order: propOrder }) => {
  const order = propOrder || route?.params?.order || {};
  const amount = Number(order.grandTotal || order.totalPrice || 0);
  const formattedAmount = `R${amount.toFixed(2)}`;
  const formattedDate =
    order.date ||
    (order.createdAt
      ? new Date(order.createdAt).toLocaleDateString("en-ZA", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : new Date().toLocaleDateString("en-ZA", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }));
  const orderNumber = order.orderId || order.id || order._id || "GS-ORDER";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#080a0b' }}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => navigation?.goBack?.()}
        activeOpacity={0.8}
      >
        <Image style={styles.backIcon} source={back} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {/* Order Confirmation */}
      <View style={styles.confirmBox}>
        <View style={styles.logoWrapper}>
          <Image source={vector} />
        </View>

        <Text style={styles.title}>Congratulations !</Text>
        <Text style={styles.subtitle}>Your order has been placed</Text>
        <Text style={styles.amount}>{formattedAmount}</Text>
        <Text style={styles.date}>{formattedDate}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Order Details</Text>
        <DetailRow label="Order Number" value={`#${orderNumber}`} />
        <DetailRow label="Payment Mode" value={order.paymentMethod || 'PayFast / Bank Transfer'} />

        <View style={{ height: 1, backgroundColor: '#343333', marginTop: 10, marginBottom: 20 }} />

        <Text style={styles.noticeText}>
          Your order will be packaged and prepared for dispatch once funds reflect in our account.
        </Text>

        <Text style={[styles.rowText, { textAlign: "left", marginBottom: 10, fontSize: 18, color: "white", fontWeight: "bold" }]}>
          Standard Bank Banking Details
        </Text>
        <DetailRow label="Company Name" value="The Grand Store PTY LTD" />
        <DetailRow label="Bank Name" value="Standard Bank" />
        <DetailRow label="Branch Name" value="Sandton City" />
        <DetailRow label="Account Number" value="0123456789" />
        <DetailRow label="Branch Code" value="051001" />
        <DetailRow label="Reference" value={String(orderNumber).slice(-8).toUpperCase()} />
        <View style={{ height: 1, backgroundColor: '#343333', marginTop: 10, marginBottom: 20 }} />
      </View>
    </ScrollView>
  );
};

const DetailRow = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowText}>{label}</Text>
    <Text style={styles.rowText}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    backgroundColor: '#c99742',
    padding: 14,
    alignItems: 'center',
  },
  backIcon: {
    marginRight: 10,
  },
  backText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  confirmBox: {
    backgroundColor: '#15120e',
    alignItems: 'center',
    padding: 20,
    margin: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(201, 151, 66, 0.22)',
  },
  logoWrapper: {
    backgroundColor: '#c99742',
    borderRadius: 50,
    padding: 18,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 16,
  },
  amount: {
    fontSize: 24,
    fontWeight: '900',
    marginVertical: 6,
    color: '#f5c242',
  },
  date: {
    color: '#888',
    fontSize: 12,
  },
  section: {
    backgroundColor: '#15120e',
    padding: 16,
    marginHorizontal: 14,
    marginTop: 6,
    marginBottom: 30,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(201, 151, 66, 0.22)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowText: {
    color: '#8B8B8B',
    fontSize: 14,
  },
  noticeText: {
    color: '#aaa',
    marginBottom: 12,
    marginTop: 8,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
});

export default Payment;
