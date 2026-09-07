/* eslint-disable prettier/prettier */
import { initNetworkResilience } from './source/helpers/networkConfig';

// Initialize network auto-detection & resilient candidate fallbacks
initNetworkResilience();

import React from 'react';
import { AppRegistry } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from './source/components/SplashScreen';
import { name as appName } from './app.json';
import NavigatorService from './source/helpers/Navigator';
import HomeScreen from './source/components/HomeScreen';
import Home from './source/components/Home';
import Cart from './source/components/Cart';
import Profile from './source/components/Profile';
import Register from './source/components/Register';
import LoginScreen from './source/components/LoginScreen';
import RegisterPatients from './source/components/Categories';
import AddAppointment from './source/components/AddAppointment';
import ViewAll from './source/components/ViewAll';
import MyOrders from './source/components/order/MyOrders';
import OrderDetails from './source/components/order/OrderDetails';
import Payment from './source/components/order/Payment';
import Checkout from './source/components/Checkout';
import WhiskyBrands from './source/components/WhiskyBrands';
import ProductDetails from './source/components/ProductDetails';
import ContactUs from './source/components/ContactUs';
import Wishlist from './source/components/Wishlist';
import PaymentDetails from './source/components/PaymentDetails';
import Offers from './source/components/Offers';
import Shop from './source/components/Shop';
import EventsHub from './source/components/events/EventsHub';
import EventDetails from './source/components/events/EventDetails';
import EventTicketPass from './source/components/events/EventTicketPass';
import AuctionsHub from './source/components/auction/AuctionsHub';
import AuctionLotDetails from './source/components/auction/AuctionLotDetails';
import AuctionCheckout from './source/components/auction/AuctionCheckout';
import MyBids from './source/components/auction/MyBids';
import CustomerDashboard from './source/components/CustomerDashboard';
import GlobalAgeVerificationModal from './source/components/GlobalAgeVerificationModal';
const Rootstack = createNativeStackNavigator();

const App = () => {
  return (
    <>
      <NavigationContainer ref={navigatorRef => {
        NavigatorService.setContainer(navigatorRef);
      }}
    >
      <Rootstack.Navigator initialRouteName="SplashScreen">
        <Rootstack.Screen
          name="SplashScreen"
          component={SplashScreen}
          options={{ headerShown: false}}
        />
        <Rootstack.Screen
          name="Cart"
          component={Cart}
          options={{ headerShown: false}}
        />
         <Rootstack.Screen
          name="Checkout"
          component={Checkout}
          options={{ headerShown: false}}
        />
        <Rootstack.Screen
          name="Shop"
          component={Shop}
          options={{ headerShown: false}}
        />
        <Rootstack.Screen
          name="Offers"
          component={Offers}
          options={{ headerShown: false}}
        />
         <Rootstack.Screen
          name="WhiskyBrands"
          component={WhiskyBrands}
          options={{ headerShown: false}}
        />
        <Rootstack.Screen
          name="MyOrder"
          component={MyOrders}
          options={{ headerShown: false}}
        />
        <Rootstack.Screen
          name="MyOrders"
          component={MyOrders}
          options={{ headerShown: false}}
        />
        <Rootstack.Screen
          name="ProductDetails"
          component={ProductDetails}
          options={{ headerShown: false}}
        />
        <Rootstack.Screen
          name="OrderDetails"
          component={OrderDetails}
          options={{ headerShown: false}}
        />
        <Rootstack.Screen
          name="Payment"
          component={Payment}
          options={{ headerShown: false}}
        />
        <Rootstack.Screen
          name="HomeScreen"
          component={HomeScreen}
          options={{ headerShown: false}}
        />
        <Rootstack.Screen
          name="ViewAll"
          component={ViewAll}
          options={{ headerShown: false}}
        />
        <Rootstack.Screen
          name="Home"
          component={Home}
          options={{ headerShown: false}}
        />
         <Rootstack.Screen
          name="Register"
          component={Register}
          options={{ headerShown: false}}
        />
        <Rootstack.Screen
          name="Profile"
          component={Profile}
          options={{ headerShown: false}}
        />
        <Rootstack.Screen
          name="LoginScreen"
          component={LoginScreen}
          options={{ headerShown: false}}
        />
        <Rootstack.Screen
          name="RegisterPatients"
          component={RegisterPatients}
          options={{ headerShown: false}}
        />
        <Rootstack.Screen
          name="AddAppointment"
          component={AddAppointment}
          options={{ headerShown: false}}
        />
         <Rootstack.Screen
          name="ContactUs"
          component={ContactUs}
          options={{ headerShown: false}}
        />
         <Rootstack.Screen
          name="PaymentDetails"
          component={PaymentDetails}
          options={{ headerShown: false}}
        />
          <Rootstack.Screen
          name="Wishlist"
          component={Wishlist}
          options={{ headerShown: false}}
        />
        <Rootstack.Screen
          name="EventsHub"
          component={EventsHub}
          options={{ headerShown: false }}
        />
        <Rootstack.Screen
          name="EventDetails"
          component={EventDetails}
          options={{ headerShown: false }}
        />
        <Rootstack.Screen
          name="EventTicketPass"
          component={EventTicketPass}
          options={{ headerShown: false }}
        />
        <Rootstack.Screen
          name="AuctionsHub"
          component={AuctionsHub}
          options={{ headerShown: false }}
        />
        <Rootstack.Screen
          name="AuctionLotDetails"
          component={AuctionLotDetails}
          initialParams={{ lotId: "6a9edb94537d52a425cc4b5c" }}
          options={{ headerShown: false }}
        />
        <Rootstack.Screen
          name="AuctionCheckout"
          component={AuctionCheckout}
          options={{ headerShown: false }}
        />
        <Rootstack.Screen
          name="MyBids"
          component={MyBids}
          options={{ headerShown: false }}
        />
        <Rootstack.Screen
          name="CustomerDashboard"
          component={CustomerDashboard}
          options={{ headerShown: false }}
        />
      </Rootstack.Navigator>
    </NavigationContainer>
    <GlobalAgeVerificationModal />
    </>
  );
};

AppRegistry.registerComponent(appName, () => App);
