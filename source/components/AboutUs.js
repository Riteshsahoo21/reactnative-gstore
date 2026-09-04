/* eslint-disable prettier/prettier */
import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {aboutcss} from './aboutcss';
import tmh_styles from '../styles/tmh_styles';
import AppHeader from '../widgets/AppHeader';

export default function AboutUs({navigation}) {
  return (
    <SafeAreaView style={styles.safeArea}>
    <AppHeader
      title="AboutUs"
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={aboutcss.mainboxabout}>
          {/* About Us Section */}
          <View>
            <View style={aboutcss.header}>
              <Text style={aboutcss.headertitle}>About Us</Text>
            </View>
            <View style={aboutcss.mainverclebox}>
              <View style={aboutcss.verticleline} />
            
            </View>
            <Text style={aboutcss.headertext}>
              As a preeminent wholesale supplier and marketer in the liquor industry, The Grand Store offers an extensive variety of luxury wines and spirits for all occasions. We at Grand Store have successfully identified the top wines and spirits from our beloved homeland South Africa and around the globe. We have also formed strong partnerships with prestigious suppliers to bring you the best products at the best prices.
            </Text>
            <Text style={aboutcss.headersubtext}>
              The Grand store is committed to excellence in every sphere. Our online, innovative approach will ensure that you have a great online shopping experience accompanied with superior customer service.
            </Text>
          </View>

          {/* A Cut Above The Rest Section */}
          <View>
            <View style={aboutcss.header}>
              <Text style={aboutcss.headertitle}>A Cut Above The Rest</Text>
            </View>
            <View style={aboutcss.mainverclebox}>
              <View style={aboutcss.verticleline} />
              
            </View>
            <Text style={aboutcss.headertext}>
              Our innovative approach illustrates our ability to offer our customers the utmost value for money. Through unprecedented involvement in every step of the process, we have raised the bar. Our elite range of products is in line with international trends. We have focused on intricate details from top sommeliers and connoisseurs that offer high quality products and topped with scheduled, timeous deliveries. We make sure that our products are thoroughly checked right from the start to the final stage of production/supply under the presence of qualified quality inspectors.
            </Text>
            <Text style={aboutcss.headersubtext}>
              For us quality is not a formality but rather an expression of our hard work and dedication.
            </Text>
          </View>

          {/* Our Strength Section */}
          <View>
            <View style={aboutcss.header}>
              <Text style={aboutcss.headertitle}>Our Strength</Text>
            </View>
            <View style={aboutcss.mainverclebox}>
              <View style={aboutcss.verticleline} />
            </View>
            <Text style={aboutcss.headertext}>
              We work relentlessly with our team to bring professionalism and zeal to outperform our competitors.
            </Text>
            <Text style={aboutcss.headersubtext}>
              Our team of highly experienced professionals is empowered with sophisticated infrastructure. We are fully immersed and dedicated and our extensive industry knowledge backed by a network of resourceful contacts, gives us a better understanding of market requirements. Our experience in the liquor and wine industry has granted us increasing accolades across the industry.
            </Text>
          </View>

          {/* Our Patrons Section */}
          <View>
            <View style={aboutcss.header}>
              <Text style={aboutcss.headertitle}>Our Patrons</Text>
            </View>
            <View style={aboutcss.mainverclebox}>
              <View style={aboutcss.verticleline} />
            </View>
            <Text style={aboutcss.headertext}>
              Optimum pricing together with on-schedule delivery has made us immensely popular among our wide clientele across the country. We boast a committed client who enable our quest for excellence by consistently ordering from Grand Store.
            </Text>
          </View>

          {/* Wine is a lifestyle! Section */}
          <View>
            <View style={aboutcss.header}>
              <Text style={aboutcss.headertitle}>Wine is a lifestyle!</Text>
            </View>
            <View style={aboutcss.mainverclebox}>
              <View style={aboutcss.verticleline} />
            </View>
            <Text style={[aboutcss.headeritaly, { alignSelf: 'center' }]}>
              Best wines are the ones we drink with friends.
            </Text>
          </View>

          {/* Chairman Statement Section */}
          <View>
            <View style={aboutcss.header}>
              <Text style={aboutcss.headertitle}>Chairman Statement</Text>
            </View>
            <View style={aboutcss.mainverchairman}>
              <View style={aboutcss.verticleline} />
            </View>
            <View style={aboutcss.chairemanbox}>
              <View style={styles.chairmanImageWrapper}>
                <Image
                  resizeMode="contain"
                  style={styles.chairmanImage}
                  source={require('../resources/assets/Chairman.jpg')}
                />
              </View>
              <View>
                <Text style={aboutcss.headertext}>
                  This pandemic has taught us the new order of engaging in business. Our response to these challenges reflects who we are as individuals and as an organization. It has changed the way we think and interact with our customers. Digitalization is an integral part of our transformation. We remain optimistic that this is a decade of great opportunity. We should capitalize on this opportunity and do our fair share for our markets recovery.
                </Text>
                <Text style={styles.chairmanName}>
                  - Mr. Pravin Upasani
                </Text>
              </View>
            </View>
          </View>

          {/* Our Motto Section */}
          <View style={{ paddingTop: 20, paddingBottom: 50 }}>
            <View style={aboutcss.header}>
              <Text style={aboutcss.headertitle}>Our Motto</Text>
            </View>
            <View style={aboutcss.mainverclebox}>
              <View style={aboutcss.verticleline} />
            </View>
            <Text style={aboutcss.headertext1}>
              To offer a great variety of spirits and wines from emerging and established companies. We ensure that our innovative solutions and exceptional service supports and enables lasting connections between wineries and our valued consumer customers.
            </Text>
          </View>

          {/* Discover Boxes Section */}
          <View style={aboutcss.discoverbox}>
            <View style={styles.iconWrapper}>
              <Image
                source={require('../resources/images/search_selected.png')}
                style={styles.iconImage}
              />
            </View>
            <Text style={aboutcss.dicovertext}>Discover new bottles</Text>
            <Text style={aboutcss.headertext1}>
              The biggest resource of different types of spirits from across the world. We promote alot of local craft spirits and local wines, from manufactures who are passionate about their work. We take great pride in bringing their products directly to you.Since launching the site, we’ve made it our goal to help you uncover fresh and interesting content about wines and spirits that matter to you.
            </Text>
          </View>

          <View style={aboutcss.discoverbox}>
            <View style={styles.iconWrapper}>
              <Image
                source={require('../resources/assets/chart.png')}
                style={styles.iconImage}
              />
            </View>
            <Text style={aboutcss.dicovertext}>Track your collection</Text>
            <Text style={aboutcss.headertext1}>
              Create an account and track your collection. All information is pre filled, just search the bottles you own and keep track of the value increase and size of your own collection.
            </Text>
          </View>

          <View style={aboutcss.discoverbox}>
            <View style={styles.iconWrapper}>
              <Image
                source={require('../resources/assets/contribute.png')}
                style={styles.iconImage}
              />
            </View>
            <Text style={aboutcss.dicovertext}>Contribute to Grandstore</Text>
            <Text style={aboutcss.headertext1}>
              The best way to contribute to our growth is for you being your self. Enjoy your experience and spread the word. Give us your reviews and keep checking our new additions everytime you visit our social platform. Bring in your suggestions and let us keep improving our levels of service.
            </Text>
          </View>

          <View style={aboutcss.discoverbox}>
            <View style={styles.iconWrapper}>
              <Image
                source={require('../resources/images/shopping-cart.png')}
                style={styles.iconImage}
              />
            </View>
            <Text style={aboutcss.dicovertext}>Buy and Sell in the market</Text>
            <Text style={aboutcss.headertext1}>
              Searching for a bottle? Maybe one of the Grandstore members has it for sale. Buy it in the marketplace or offer your spare bottles yourself. Help out Grandstore friends to complete their collection.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1c1c1c',
  },
  scrollContent: {
    padding: 16,
  },
  chairmanImageWrapper: {
    width: '100%',
    height: 160,
    marginRight: 12,
  },
  chairmanImage: {
    width: '100%',
    height: '100%',
  },
  chairmanName: {
    color: '#c99742',
    fontSize: 18,
    marginTop: 8,
    fontWeight: '600',
  },
  iconWrapper: {
    width: 39,
    height: 39,
    marginRight: 12,
  },
  iconImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    tintColor: '#c99742',
  },
});