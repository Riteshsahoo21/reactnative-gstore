/* eslint-disable prettier/prettier */
import React from 'react';
import {Text,TouchableOpacity,ActivityIndicator} from 'react-native';

import Colors from '../resources/colors/Colors';


const AppButton = ({
  title,
  onPress,
  loading,
  fontFamily,
  color_,
  fontSize,
  width,
  height,
  borderRadius,
  alignItems,
  alignSelf,
  justifyContent,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  backgroundColor,
  fontWeight,
  shadowColor,
  shadowOpacity,
  elevation,
  shadowRadius,
  loadingMessage,
  borderColor,
  borderWidth,
  opacity,
  disabled,
}) => {
  return (

    <TouchableOpacity style={{
      width: width,
      borderRadius: borderRadius,
      height: height,
      alignItems: alignItems,
      justifyContent: justifyContent,
      marginTop: marginTop,
      marginBottom: marginBottom,
      marginLeft: marginLeft,
      marginRight: marginRight,
      backgroundColor: backgroundColor,
      fontWeight: fontWeight,
      color: color_,
      shadowColor: shadowColor,
      shadowOpacity: shadowOpacity,
      elevation: elevation,
      shadowRadius: shadowRadius,
      alignSelf:alignSelf,
      borderColor: borderColor,
      borderWidth: borderWidth,
      opacity:opacity
    }} 
    disabled={disabled}
    onPress={onPress} 
   >
    <Text style={{
        fontFamily:fontFamily,
        color: color_,
        fontSize: fontSize,
    }} >  
          
    {title && (
        <Text
        style={{
            paddingLeft: loading ? 25 : 0,
        }}>
        {loading ? loadingMessage : title}
        </Text>
    )}
        {loading && (
        <ActivityIndicator
        color={loading ? color_ : Colors.loader_color_tmb}
        />
    )}
     
      </Text>
  </TouchableOpacity>
  );
};


export default AppButton;
