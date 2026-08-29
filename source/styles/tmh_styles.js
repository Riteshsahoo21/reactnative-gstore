/* eslint-disable prettier/prettier */
/* eslint-disable no-unused-vars */
import {StyleSheet} from 'react-native';
import { FONT, HEADER_HEIGHT_THRESHOLD} from '../resources/data/Constants';
import { Platform } from 'react-native';
import { APP_FONT, FONT_OPEN_SANS, FONT_SOURCE_SANS } from '../resources/data/Fonts';
import Colors from '../resources/colors/Colors';

export default StyleSheet.create({

    container: {
        flex: 1,
        alignItems: 'center',
        paddingBottom:15,
        paddingHorizontal:15,
      },

    container2: {
        flex: 1,
        paddingBottom:15,
      },

    gesture_base: {
        width: '100%',
        height: '55%',
        alignSelf:'center',
        alignItems:'center',
        justifyContent:'center',
        backgroundColor:Colors.white_tmb,
        shadowColor: Colors.shadow_color_tmb,
        shadowOffset: Platform.OS == 'android' ? null :  {width: -1, height: -1},
        shadowRadius: Platform.OS == 'android' ? null : 3,
        shadowOpacity: Platform.OS == 'android' ? null :  1.2,
        elevation:15
    },

    view_shot_base: {
        width: '97%',
        height: '97%',
        alignSelf:'center',
        alignItems:'center',
        justifyContent:'center'
    },

    base_image: {
        width: '100%',
        height: '100%',
    },

    base_image_container: {
        flex: 1,
        width:'100%',
        height:'100%',
      },

      header_title_tmb : {
        color: Colors.black_tmb,
        fontSize:20,
        fontFamily:APP_FONT,
        fontWeight:'500',
    },

    header_title_tmb2 : {
        color: Colors.white_tmb,
        fontSize:16,
        fontFamily:APP_FONT,
    },

    edit_actions_main_holder : {
        width:'100%',
        backgroundColor: Colors.white_tmb,
        shadowColor: Colors.shadow_color_tmb,
        shadowOffset: Platform.OS == 'android' ? null : {width: -1, height: -1},
        shadowRadius: Platform.OS == 'android' ? null : 3,
        shadowOpacity: Platform.OS == 'android' ? null : 1.2,
        elevation:10,
        alignSelf:'center',
        alignItems:'center',
        justifyContent:'center',
    },

    editing_elements_holder : {
        flex:4, 
        flexDirection:'row',
        alignItems:'center',
        justifyContent:'center',
    },

    editing_action_element : {
        flexDirection:'column',
        alignItems:'center',
        alignSelf:'center',
        justifyContent:'center',
    },

    editing_action_title : {
        color: Colors.header_title_color,
        fontSize:11,
        fontFamily:APP_FONT,
        alignSelf:'center',
        marginTop:5,
      },

})

