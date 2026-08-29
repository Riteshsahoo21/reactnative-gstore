/* eslint-disable react-native/no-inline-styles */
/* eslint-disable prettier/prettier */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native';
import vector from '../../resources/assets/Vector-3.png'
import back from '../../resources/assets/back.png'
const Payment = ({ order }) => {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#080a0b' }}>
      <View style={styles.header}>
        <Image style={styles.backIcon} source={back}/>
        <Text style={styles.backText}>Back</Text>
      </View>

      {/* Order Confirmation */}
      <View style={styles.confirmBox}>
        {/* Logo */}
        <View style={styles.logoWrapper}>
          <Image
            source={vector}
          />
        </View>

        <Text style={styles.title}>Congratulations !</Text>
        <Text style={styles.subtitle}>Your order has been placed</Text>
        <Text style={styles.amount}>$745,75</Text>
        <Text style={styles.date}>Jan 08,2024</Text>
      </View>


      <View style={styles.section}>
        <Text style={styles.title} >Order Details</Text>
        <DetailRow  label="Order Number" value={123}/>
        <DetailRow  label="Payment Mode" value={'Direct Bank Transfer'}/>

        <View style={{ height: 1, backgroundColor: '#343333', marginTop: 10, marginBottom: 20 }} />

        <Text style={styles.noticeText}>
          Your order will not be shipped until the funds have cleared in our
          account.
        </Text>

        <Text style={[styles.rowText, { textAlign: "left", marginBottom: 10 , fontSize:18, color:"white",fontWeight:"bold",}]}>
          Banking Details
        </Text>
        <DetailRow label="Company Name" value="Nivarp International (PVT) LTD" />
        <DetailRow label="Bank Name" value="First National Bank" />
        <DetailRow label="Branch Name" value="Bryanston" />
        <DetailRow label="Bank Account Number" value="62555239419" />
        <DetailRow label="Swift Code" value="FIRNZAJJ" />
        <DetailRow label="Branch Code" value="250017" />
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
    flexDirection:'row',
    backgroundColor:'#ae7718',
    padding: 12,
  },
  backIcon:{
     marginTop:5,
     marginRight:10,
  },
  backText: {
    color: '#1b1c1e',
    fontWeight: 'bold',
    fontSize: 19,

  },
  confirmBox: {
    backgroundColor: '#1A1C1E',
    alignItems: 'center',
    padding: 20,
    margin: 12,
    borderRadius: 10,
  },
  logoWrapper: {
    backgroundColor: '#ae7718',
    borderRadius: 50,
    padding: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom:10,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    marginBottom:25,
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 10,
    color: '#fff',
  },
  date: {
    color: '#ccc',
  },
  section: {
    backgroundColor: '#1A1C1E',
    padding: 15,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowText: {
    color: '#8B8B8B',
    fontSize: 16,
    
  },
  notice: {
    padding: 15,
    marginHorizontal: 12,
  },
  noticeText: {
    color: '#8B8B8B',
    marginBottom: 12,
    marginTop:8,
    fontSize: 16,
    textAlign:"center",
    fontFamily:'Roboto Slab',
    lineHeight:23
  },
});

export default Payment;
