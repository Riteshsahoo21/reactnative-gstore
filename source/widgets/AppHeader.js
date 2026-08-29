/* eslint-disable react-native/no-inline-styles */
/* eslint-disable prettier/prettier */
import React, {Fragment} from 'react';
import {View, TouchableOpacity, Text, StyleSheet, Dimensions, StatusBar} from 'react-native';
import PropTypes from 'prop-types';
import LinearGradient from 'react-native-linear-gradient';
import { getImageSourceWithFallback } from '../helpers/helper';
import { Image } from 'react-native';
import Colors from '../resources/colors/Colors';
import { BACK_ICON, DOWN_ARROW_ICON, LOGO_HORIZONTAL } from '../resources/data/Images';
import { APP_FONT } from '../resources/data/Fonts';

// import AsyncStorage from '@react-native-async-storage/async-storage';


const Header = (props) => {
    const {
        backgroundColor,
        width,
        height,
        headerStyle,
        isBack,
        backIconColor,
        backButtonStyle,
        backButtonComponent,
        isGradient,
        colors,
        start,
        end,
        locations,
        title,
        titleStyle,
        titleComponent,
        rightButtons,
        isShowShadow,
        shadowColor,
        shadowSize,
        elevation,
        isTransparentStatusBar,
        statusBarColor,
        statusBarStyle,
        navigation,
        logoImage,
        logoHeight,
        logoWidth,
        isTitleAction,
        titlePressAction,
    } = props;

    const statusBarHeight = StatusBar.currentHeight;


    const renderBackButton = () => {
        if (isBack) {
            if (backButtonComponent === null) {
                return (
                    <TouchableOpacity
                        style={[styles.back, backButtonStyle, { marginRight:10}]}
                        onPress={() => {
                            navigation.goBack();
                        }}>

                        <Image
                            style={{
                                width:24,
                                height:20,
                            }}
                            resizeMode={'contain'}
                            source={require('../resources/images/back_icon.png')}/>
                    </TouchableOpacity>
                );
            } else {
                return backButtonComponent;
            }
        }
    };

    const renderTitle = () => {
        if (isTitleAction === true)
        {
            return (
                <TouchableOpacity
                    style={[{flexDirection:'row'}]}
                    onPress={() => titlePressAction()}
                >
                    <Text style={[{fontFamily:APP_FONT}, titleStyle ]}>{title}</Text>
                </TouchableOpacity>
            );
        }
        else if (title !== null && (logoImage == null || logoImage == '')) {
            return (
                <Text style={[titleStyle]}>{title}</Text>
            );
        } else {
            if (titleComponent !== null) {
                return titleComponent;
            }
        }
    };

    const renderLogo = () => {
        if (isTitleAction !== true)
        {
            if (logoImage != null) {
                return (
                    <Image
                    style={{height:logoHeight, width:logoWidth, marginLeft:-20}}
                    source={getImageSourceWithFallback(logoImage, LOGO_HORIZONTAL)}
                    resizeMode="contain"
                />
                );
            }
        }
    };


    const renderRightButtons = () => {
        if (rightButtons !== null) {
            return (
                <View style={{flexDirection: 'row'}}>
                    {
                        rightButtons.map(button => {
                            const {
                                id,
                                color,
                                content,
                                action,
                            } = button;

                            return (
                                <TouchableOpacity
                                    key={id}
                                    style={[styles.rightButton, {backgroundColor: color,}]}
                                    onPress={() => action()}
                                >
                                    {content}
                                </TouchableOpacity>
                            );
                        })
                    }
                </View>
            );
        }
    };

    if (isGradient) {
        return (
            <Fragment>
                <StatusBar
                    backgroundColor={statusBarColor}
                    translucent={isTransparentStatusBar}
                    barStyle={statusBarStyle}
                />

                <LinearGradient
                    style={[
                        {backgroundColor, width, height},
                        isTransparentStatusBar && {height: height + statusBarHeight, paddingTop: statusBarHeight},
                        isShowShadow &&
                        {
                            shadowColor,
                            shadowOffset: {width: 0, height: shadowSize},
                            shadowOpacity: 0.1,
                            shadowRadius: 13,
                            elevation,
                        },
                        styles.header,
                        headerStyle,
                    ]}
                    colors={colors}
                    start={start}
                    end={end}
                    locations={locations}
                >
                    <View style={styles.leftHeader}>
                        {renderBackButton()}
                        {renderTitle()}
                        {renderLogo()}
                    </View>

                    {renderRightButtons()}
                </LinearGradient>
            </Fragment>
        );
    } else {
        return (
            <Fragment>
                <StatusBar
                    backgroundColor={statusBarColor}
                    translucent={isTransparentStatusBar}
                    barStyle={statusBarStyle}
                />

                <View
                    style={[
                        {backgroundColor},
                        isTransparentStatusBar && {height: height + statusBarHeight, paddingTop: statusBarHeight},
                        isShowShadow &&
                        {
                            shadowColor,
                            shadowOffset: {width: 0, height: shadowSize},
                            shadowOpacity: 0.1,
                            shadowRadius: 13,
                            elevation,
                        },
                        styles.header,
                        headerStyle,
                    ]}
                >
                    <View style={styles.leftHeader}>
                        {renderBackButton()}
                        {renderTitle()}
                        {renderLogo()}
                    </View>

                    {renderRightButtons()}
                </View>
            </Fragment>
        );
    }
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    leftHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    back: {
        paddingVertical:5,
        paddingRight:5,
        width:40,
        height:40,
        alignItems:'center',
        justifyContent:'center',
        alignSelf:'center',
    },
    rightButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 100,
    },
});

Header.defaultProps = {
    backgroundColor: 'black',
    width: Dimensions.get("window").width,
    height: 50,
    headerStyle: null,
    isBack: false,
    backIconColor: 'white',
    backButtonStyle: null,
    backButtonComponent: null,
    isGradient: false,
    colors: ['#6a11cb', '#2575fc'],
    start: {x: 0, y: 0},
    end: {x: 1, y: 0},
    locations: [0, 1],
    title: '',
    titleStyle: null,
    titleComponent: null,
    rightButtons: null,
    isShowShadow: false,
    shadowColor: 'black',
    shadowSize: 2,
    elevation: 20,
    isTransparentStatusBar: true,
    statusBarColor: 'transparent',
    statusBarStyle: 'light-content',
};

Header.propTypes = {
    backgroundColor: PropTypes.string,
    width: PropTypes.number,
    height: PropTypes.number,
    headerStyle: PropTypes.object,
    isBack: PropTypes.bool,
    backIconColor: PropTypes.string,
    backButtonStyle: PropTypes.object,
    backButtonComponent: PropTypes.any,
    isGradient: PropTypes.bool,
    colors: PropTypes.array,
    start: PropTypes.object,
    end: PropTypes.object,
    locations: PropTypes.array,
    title: PropTypes.string,
    titleStyle: PropTypes.object,
    titleComponent: PropTypes.any,
    rightButtons: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        color: PropTypes.string.isRequired,
        content: PropTypes.any.isRequired,
        action: PropTypes.func.isRequired,
    })),
    isShowShadow: PropTypes.bool,
    shadowColor: PropTypes.string,
    shadowSize: PropTypes.number,
    elevation: PropTypes.number,
    isTranslucentStatusBar: PropTypes.bool,
    statusBarColor: PropTypes.string,
    statusBarStyle: PropTypes.string,
};

export default Header;
