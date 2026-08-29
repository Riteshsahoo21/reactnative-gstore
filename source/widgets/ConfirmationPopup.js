/* eslint-disable react-native/no-inline-styles */
/* eslint-disable prettier/prettier */
import React from 'react';
import {
  Modal,
  Text,
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';

import {
    DELETEACCOUNT,
  LOGOUTSCREEN,
} from '../resources/data/Images';
import { APP_FONT } from '../resources/data/Fonts';
import Colors from '../resources/colors/Colors';


export default function ConfirmationPopup({ visibility, message, image, purpose, confirmationDecision }) {

  return (
    <View>
      <Modal visible={visibility} animationType={'fade'} transparent={true}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(52, 52, 52, 0.8)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={[
              styles.view_style,
              styles.sucees_style,
              { overflow: 'visible', paddingVertical:25 },
              
            ]}
          >
            <Image
              source={image}
              resizeMode="contain"
              style={{ width: '100%', height: 100 }}
            />

            <Text
              style={{
                fontSize: 15,
                fontFamily: APP_FONT,
                color: Colors.black_tmb,
                marginTop: 15,
                marginBottom: 25,
                justifyContent:'center',
                textAlign:'center',
                marginHorizontal:15,
                fontWeight: 700,
              }}
            >
              {message}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                marginHorizontal: 10,
              }}>

              <TouchableOpacity
                onPress={() => {
                  confirmationDecision(false, purpose);
                }}
                style={[
                  {
                    marginHorizontal: 10,
                    fontSize: 17,
                    borderRadius: 12,
                    padding: 5,
                    borderColor: Colors.secondary,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  style={{
                    marginHorizontal: 25,
                    fontSize: 17,
                    color:Colors.secondary,
                    fontFamily:APP_FONT
                  }}
                >
                  No
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  confirmationDecision(true, purpose);
                }}
                style={[
                  {
                    marginHorizontal: 10,
                    fontSize: 17,
                    borderRadius: 12,
                    padding: 5,
                    fontFamily:APP_FONT,
                    backgroundColor: Colors.secondary,
                    borderColor: Colors.secondary,
                  },
                ]}
              >
                <Text
                  style={{
                    marginHorizontal: 25,
                    fontSize: 17,
                    color: Colors.white_tmb
                  }}
                >
                  Yes
                </Text>
              </TouchableOpacity>

            </View>

          </View>
        </View>
      </Modal>
    </View>
  );
}

// ... (previous styles)


const styles = StyleSheet.create({
  view_style: {
    alignItems: 'center',
    backgroundColor: Colors.white_tmb,
    width: '80%',
    justifyContent:'center',
    borderWidth: 2,
    borderColor: Colors.white_tmb,
    borderRadius: 15,
    elevation: 10,
    padding:15,
  },
  sucees_style: {
    borderColor: Colors.white_tmb,
  },
  error_style: {
    borderColor: Colors.white_tmb,
  },

  Buttonstyle: {
    width: '40%',
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0,
    borderRadius: 5,
    marginLeft: 15,
    marginBottom: 10,
  },

  sucees_textstyle: {
    backgroundColor: Colors.primary,
    borderColor: Colors.secondary,
  },

  successButtonStyle: {
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.secondary,
    borderColor: Colors.btn_border_tmb,
  },

  errorButtonStyle: {
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.negative_btn_bg_tmb,
    borderColor: Colors.negative_btn_border_tmb,
  },
});



