/* eslint-disable prettier/prettier */
import React from "react";
import {
  ScrollView,
  SafeAreaView,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import tmh_styles from "../styles/tmh_styles";
import AppHeader from '../widgets/AppHeader';

const ContactUs = ({navigation}) => {
  // Link opener
  const openLink = async (url) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      alert("Can't open URL: " + url);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: "#1c1c1c" }}>
       <AppHeader
            title="Contact Us"
            isGradient={false}
            backgroundColor="#0c0a08"
            statusBarColor="#0c0a08"
            statusBarStyle="light-content"
            titleStyle={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}
            isShowShadow={false}
            isBack={true}
            backButtonStyle={{ width: 35, height: 25, alignItems: "center" }}
            backIconColor="white"
            logoImage={null}
            navigation={navigation}
       />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.pageTitle}>Contact Us</Text>

          <View style={styles.card}>
            {/* Phone */}
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Image
                  source={require("../resources/images/globe.png")}
                  style={styles.iconImage}
                />
              </View>
              <Text style={styles.infoText}>+27 76 580 9522</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Image
                  source={require("../resources/images/globe.png")}
                  style={styles.iconImage}
                />
              </View>
              <Text style={styles.infoText}>+27 82 496 7256</Text>
            </View>

            {/* Email */}
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Image
                  source={require("../resources/images/globe.png")}
                  style={styles.iconImage}
                />
              </View>
              <Text style={styles.infoText}>info@grandstore.co.za</Text>
            </View>

            {/* Address */}
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Image
                  source={require("../resources/images/globe.png")}
                  style={styles.iconImage}
                />
              </View>
              <View style={styles.addressTextWrapper}>
                <Text style={styles.infoText}>Pivot Building</Text>
                <Text style={styles.infoText}>
                  1 Montecasino Blvd, Fourways, Sandton, 2191.
                </Text>
              </View>
            </View>

            {/* Follow Us */}
            {/* <Text style={styles.Followus}>Follow Us</Text>
            <View style={styles.socialIconsRow}>
              <TouchableOpacity onPress={() => openLink("https://www.facebook.com/thegrandstoreofficial")}>
                <Image
                  source={require("../../assets/facebook.png")}
                  style={styles.socialIcon}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => openLink("https://www.instagram.com/thegrandstoreofficial/")}>
                <Image
                  source={require("../../assets/instagram.png")}
                  style={styles.socialIcon}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => openLink("https://x.com/Thegrandstore1")}>
                <Image
                  source={require("../../assets/twitter.png")}
                  style={styles.socialIcon}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => openLink("https://www.pinterest.com/thegrandstore1/")}>
                <Image
                  source={require("../../assets/instagram.png")} 
                  style={styles.socialIcon}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => openLink("https://www.youtube.com/@thegrandstoreofficial")}>
                <Image
                  source={require("../../assets/twitter.png")}
                  style={styles.socialIcon}
                />
              </TouchableOpacity>
            </View> */}
          </View>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
};


 const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    padding: 20,
  },

  pageTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#c99742",
    marginBottom: 20,
    textAlign: "center",
  },

  card: {
    backgroundColor: "#2c2c2c",
    borderRadius: 10,
    padding: 20,
    borderColor: "#575757",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 25,
  },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#c99742",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
    marginTop: 5,
  },

  iconImage: {
    width: 20,
    height: 20,
    tintColor: "#fff",
    resizeMode: "contain",
  },

  infoText: {
    color: "#dcdcdc",
    fontSize: 15,
    marginTop: 9,
    flexShrink: 1, // prevent text overflow
  },

  addressTextWrapper: {
    flex: 1,
    flexDirection: "column",
  },

  Followus: {
    fontSize: 22,
    fontWeight: "600",
    color: "#c99742",
    marginTop: 25,
    marginBottom: 15,
  },

  socialIconsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingHorizontal: 10,
  },

  socialIcon: {
  
    borderWidth: 1,
    //borderColor: "#ffffff",
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
    marginTop: 5,
  },
});
export default ContactUs;