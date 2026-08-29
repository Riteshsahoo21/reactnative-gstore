/* eslint-disable prettier/prettier */
import {StyleSheet} from 'react-native';
import { FONT} from '../resources/data/Constants';
import Colors from '../resources/colors/Colors';

export default StyleSheet.create({

    container_tmb1:{
        flex:1,
        backgroundColor:'#0d0d0d',
       
    },

    frame_container_tmb1:{
      flex:1,
      height:'100%',
    },


    container_tmb2:{
        flex:1,
        width:'100%',
        backgroundColor:Colors.bg_color_tmb,
        justifyContent:'flex-start',
        alignItems:'center',
    },


    container_tmb4: {
        height:"100%",
        flex:1,
        alignItems:'center'
      },
    

      container_tmb6: {
        alignSelf:'center',
        alignItems:'center',
        flex:1,
        marginVertical: 5,
        width:'100%',
        paddingTop: (Platform.OS) === 'ios' ? 0 : 0
      },
      
      container_tmb7:{
        flex:1,
        height:'100%',
        width:'100%',
        paddingLeft:15,
        paddingRight:15,
        justifyContent:'center',
        alignItems:'center',
        alignSelf:'center',
    },

    container_tmb8: {
      alignSelf:'center',
      justifyContent: 'center',
      width:'100%',
      paddingTop: (Platform.OS) === 'ios' ? 0 : 0
    },

    container_tmb9:{
      flex:1,
      flexDirection:'column',
      width:'100%',
      backgroundColor:Colors.bg_color_tmb,
  },

  container_tmb10:{
    alignItems:'center',
    alignContent:'center',
    alignSelf:'center',
    backgroundColor:Colors.primary,
    width:'95%'
},


  full_logo_tmb:{
        margin:45
    },


  tab_item : {
    alignItems:'center', 
  },

  tab_item_view : {
    alignItems:'center', 
  },

  tab_item_label : 
    { alignItems: 'center',
       marginTop:2
    },

  banner:{
      margin:10,
      alignSelf:'center',
      width:'95%',
      shadowColor: Colors.primary,
      elevation: 5,
      borderRadius:10, 
  },

  shadow_banner:{
    alignSelf:'center',
    width:'95%',
    borderRadius:10, 
    backgroundColor: Colors.white_tmb,
    shadowColor: Colors.shadow_color_tmb,
    shadowOffset: {width: -1, height: -1},
    shadowRadius: 3,
    shadowOpacity: 1.2,
},

  banner_image:{
    alignSelf:'center',
    width:'100%',
    borderRadius:10, 
},


    logo_icon:{
      height:125,
      width:125,
      margin:10
    },


    no_data_icon:{
      height:125,
      width:125,
      margin:10
    },



    input_wrapper_tmb: {
        borderRadius: 5,
        width: '90%',
        alignSelf:'center',
        justifyContent:'center',
        alignItems:'center',
        borderColor: Colors.border_color_tmb,
        borderWidth:1,
      },

    input_label_tmb : {
        color: Colors.input_label_color, 
        marginTop: 15, 
        fontFamily: FONT,
        marginBottom:15
    },

    error_tmb : {
        color: Colors.error_color_tmb,
        alignSelf:'center',
        fontFamily:FONT
    },

    divider_tmb: {
        backgroundColor: Colors.divider_color_tmb,
        height: 1,
        justifyContent:'center',
        alignSelf:'center',
        width: '75%',
      },

    vertical_divider_tmb: {
        backgroundColor: Colors.divider_color_tmb,
        height: '70%',
        justifyContent:'center',
        alignSelf:'center',
        width: 1,
        marginHorizontal:10
      },
    


    footer_title : {
      color: Colors.header_title_color,
      fontSize:12,
      fontFamily:FONT,
      alignSelf:'center',
      marginVertical:5,
    },

    grid_item : {
      justifyContent: 'center',
      shadowColor: Colors.primary,
      elevation: 8,
      flex:1,
      alignItems: 'center',
      height: 100,
      margin: 5,
      borderRadius:10,
      backgroundColor: Colors.primary
    },

    list_item : {
      width:'90%',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf:'center',
      flex:1,
      margin: 10,
      borderRadius:10,
      backgroundColor: Colors.card_bg_color_tmb,
      borderColor:Colors.border_color_tmb,
      elevation:5,
    },

    list_item4 : {
      flex:1,
      width:'90%',
      alignSelf:'center',
      alignItems: 'center',
      alignContent:'center',
      marginVertical: 10,
      borderRadius:10,
      backgroundColor: Colors.card_bg_color_tmb,
    },

    list_item3 : {
      width:'100%',
      justifyContent: 'center',
      alignSelf:'center',
      flex:1,
      alignItems: 'center',
      margin: 10,
      padding:5,
      borderRadius:10,
      borderWidth:1,
      borderColor:Colors.divider_color_tmb,
      backgroundColor: null,
      opacity:1,
      shadowOpacity:1,
    },



    list_item5 : {
      width:'90%',
      justifyContent: 'center',
      alignSelf:'center',
      alignItems: 'center',
      margin: 10,
      borderRadius:10,
      padding:5,
      backgroundColor: Colors.btn_bg_color,
      opacity:1,
      borderColor:Colors.border_color_tmb,
      borderWidth:1,
      flex:1,
    },

    list_item7 : {
      width:'100%',
      justifyContent: 'center',
      alignSelf:'flex-start',
      flex:1,
      alignItems: 'flex-start',
      margin: 10,
      borderRadius:10,
      opacity:1,
      borderColor:Colors.border_color_tmb,
    },

    list_item8 : {
      width:'90%',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf:'center',
      flex:1,
      margin: 10,
      borderRadius:10,
      backgroundColor: Colors.card_bg_color_tmb,
      borderColor:Colors.border_color_tmb,
      elevation:5,
    },

    menu_details_bottom: {
      width:'100%', 
      justifyContent:'center', 
      alignItems:'center', 
      position:'absolute', 
      bottom:0, 
      borderBottomLeftRadius:10, 
      borderBottomRightRadius:10
    },  

    list_item6 : {
      width:'90%',
      justifyContent: 'center',
      alignSelf:'center',
      flex:1,
      alignItems: 'center',
      margin: 10,
      borderRadius:10,
      backgroundColor: Colors.card_bg_color_tmb,
      opacity:1,
      borderColor:Colors.border_color_tmb,
    },



    inner_list_item_single_line : {
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding:1,
    },

    list_item_sub_header: {
      alignItems:'center', 
      alignSelf:'center', 
      width:'100%', 
      backgroundColor:Colors.sub_header_color_tmb, 
      flexDirection:'row',
      borderRadius:3
    },

    list_item_sub_header_content: {
      alignItems:'center', 
      alignSelf:'center', 
      width:'100%', 
      flexDirection:'row',
      borderRadius:3
    },

    list_item_sub_header_text: {
      fontSize: 14,
      fontFamily: FONT,
      fontWeight:'bold',
      padding:2,
      color: Colors.general_title_font_color,
    },

    list_item_sub_header_content_text: {
      fontSize: 14,
      fontFamily: FONT,
      fontWeight:'bold',
      padding:2,
      color: Colors.value_text_color,
    },

    header_title_tmb : {
      color: Colors.header_title_color,
      fontSize:20,
      fontFamily:FONT
  },

    horizontal_grid_item : {
      justifyContent: 'flex-start',
      shadowColor: Colors.shadow_color_tmb,
      elevation: 8,
      padding:10,
      flex:1,
      flexDirection:'row',
      alignItems: 'flex-start',
      margin: 5,
      borderRadius:10,
      backgroundColor: Colors.card_bg_color_tmb
    },

    horizontal_grid_item2 : {
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      alignSelf:'center',
      paddingHorizontal:10,
      paddingVertical:5,
      flex:1,
      flexDirection:'row',
      marginHorizontal: 5,
      marginVertical:2,
      borderRadius:10,
      backgroundColor: Colors.card_bg_color_tmb,
      width:'100%'
    },

    checkbox_wrapper: {
      flexDirection: 'row',
      marginTop: 10,
      alignItems: 'center',
      alignSelf:'center',
      width:'94%',
    },
  
    checkbox_label: {
      fontSize: 12,
      width: '95%',
      color: Colors.input_text_color,
      alignItems: 'baseline',
      fontFamily: FONT,
      alignContent: 'center',
      justifyContent: 'center',
      marginLeft: 5,
    },

    checkbox_medium: {
      fontSize: 15,
      width: '95%',
      color: Colors.input_text_color,
      alignItems: 'baseline',
      fontFamily: FONT,
      alignContent: 'center',
      justifyContent: 'center',
      marginLeft: 5,
    },

    checkbox_large: {
      fontSize: 18,
      width: '95%',
      color: Colors.input_text_color,
      alignItems: 'baseline',
      fontFamily: FONT,
      alignContent: 'center',
      justifyContent: 'center',
      marginLeft: 5,
    },

    input_label :  {
      alignSelf: 'baseline', 
      backgroundColor: Colors.bg_color_tmb,
      color:Colors.black_tmb,
      paddingHorizontal: 10,
      marginLeft:0,
      fontSize: 14,
      zIndex:999,
      borderRadius:3,
      marginBottom:-10,
      fontFamily:FONT
    },

  large_button_text_tmb: {
      fontSize: 18,
      fontWeight: 600,
      color: Colors.btn_text_color,
      paddingRight: 5,
      paddingLeft: 5,
      paddingTop: 3,
      paddingBottom: 3,
      fontFamily:FONT
    },

  small_button_text_tmb: {
    fontSize: 14,
    fontWeight: '300',
    color: Colors.btn_text_color,
    paddingRight: 5,
    paddingLeft: 5,
    paddingTop: 3,
    paddingBottom: 3,
    fontFamily:FONT
  },

  small_negative_button_text_tmb: {
    fontSize: 16,
    fontWeight: '300',
    color: Colors.btn_text_negative_color,
    fontFamily:FONT
  },

  small2_button_text_tmb: {
    fontSize: 12,
    fontWeight: '300',
    color: Colors.btn_text_color,
    paddingHorizontal: 4,
    paddingVertical: 2,
    fontFamily:FONT
  },

  small_xparent_text_tmb: {
    fontSize: 16,
    fontWeight: '300',
    color: Colors.btn_xparent_text_color,
    paddingHorizontal: 4,
    paddingVertical: 2,
    fontFamily:FONT
  },

  smaller_xparent_text_tmb: {
    fontSize: 14,
    fontWeight: '300',
    color: Colors.btn_xparent_text_color,
    paddingHorizontal: 4,
    paddingVertical: 2,
    fontFamily:FONT
  },

  indicator_wrapper:{
      alignItems: 'center',
      borderRadius: 5,
      backgroundColor: Colors.error_color_tmb,
      flexDirection: 'row',
      padding: 2,
      height: 30,
      paddingLeft: 10,
      paddingRight: 10,
  },

  indicator_wrapper2:{
    alignItems: 'center',
    alignSelf:'flex-start',
    borderRadius: 5,
    backgroundColor: Colors.error_color_tmb,
    flexDirection: 'row',
    paddingVertical: 2,
    height: 25,
    paddingLeft: 5,
    paddingRight: 5,
    width:'100%'
},

  indicator_label: {
    fontSize: 14,
    fontWeight: '300',
    color: Colors.indicator_label_text_color,
    paddingHorizontal: 5,
    paddingVertical: 3,
    fontFamily:FONT
  },

  indicator_label_dark: {
    fontSize: 14,
    fontWeight: '300',
    color: Colors.indicator_label_text_color_dark,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderBottomWidth:1,
    borderBottomColor:Colors.border_color_tmb,
    fontFamily:FONT
  },

  indicator_label_negative: {
    fontSize: 14,
    fontWeight: '300',
    color: Colors.indicator_label_text_color_negative,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderBottomWidth:1,
    borderBottomColor:Colors.border_color_tmb,
    fontFamily:FONT
  },

  circle: {
    width: 65,
    height: 65,
    borderRadius: 65 / 2,
    backgroundColor: Colors.secondary,
    alignItems:'center',
    justifyContent:'center'
  },

  circle4: {
    width: 55,
    height: 55,
    borderRadius: 55 / 2,
    alignItems:'center',
    justifyContent:'center'
  },


  no_data_view: {
    flexDirection: 'column',
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily:FONT
  },

  tmb_toast : {
    backgroundColor:Colors.primary,
    fontFamily:FONT
  },

  tmb_toast_text : {
    color:Colors.white_tmb,
    fontFamily:FONT
  },


  square_icon_btn_normal : {
    alignItems: 'center',
      justifyContent:'center',
      flexDirection: 'column',
      padding:5,
      width:70,
      height:70,
      backgroundColor: Colors.bg_color_tmb,
      shadowColor: Colors.shadow_color_tmb,
      shadowOffset: {width: -1, height: -1},
      shadowRadius: 1,
      shadowOpacity: 0.5,
      borderRadius: 5
  },

  square_icon_btn_selected : {
    alignItems: 'center',
    justifyContent:'center',
    flexDirection: 'column',
    padding:5,
    width:74,
    height:74,
    borderColor:Colors.secondary,
    borderWidth:1,
    backgroundColor: Colors.bg_color_tmb,
    shadowColor: Colors.shadow_color_tmb,
    shadowOffset: {width: -1, height: -1},
    shadowRadius: 3,
    shadowOpacity: 1,
    borderRadius: 5
  },


    // =======Settings Section CSS======

    setting_header_wrapper2: {
      backgroundColor:Colors.card_bg_color_tmb,
      alignSelf:'center',
      alignItems:'center',
      justifyContent:'center',
      width:'90%',
      flexDirection:'row',
      borderRadius:5,
    },

    setting_header2: {
      flex: 1,
      flexDirection: 'row',
      width: '100%',
      alignItems:'center',
      alignSelf:'flex-start',
      margin:15,
    },

    setting_menu_container: {
      backgroundColor:Colors.card_bg_color_tmb,
      alignSelf:'center',
      width: '90%',
      height:'80%',
      borderRadius:5,
      flexDirection:'column'
    },


    setting_header_wrapper: {
      backgroundColor:Colors.card_bg_color_tmb,
      shadowColor:Colors.secondary,
      paddingBottom:20,
      paddingTop:15
    },

    setting_header: {
        flex: 1,
        flexDirection: 'row',
        width: '90%',
        alignItems:'center',
        alignSelf:'flex-start',
      },

      setting_header_data: {
        paddingLeft:10,
        flex: 3,
        flexDirection: 'column',
        width: '100%',
      },

      large_app_name: {
        fontSize: 40,
        fontFamily: FONT,
        fontWeight:'bold',
        color: Colors.large_title_color,
      },


      general_title: {
        fontSize: 16,
        fontFamily: FONT,
        fontWeight:'500',
        color: Colors.general_title_font_color,
        marginBottom: 10,
      },

      general_title2: {
        fontSize: 17,
        fontFamily: FONT,
        fontWeight:'500',
        color: Colors.general_title_font_color,
      },

      general_title4: {
        fontSize: 14,
        fontFamily: FONT,
        fontWeight:'500',
        color: Colors.primary,
        margin:2
      },


      general_title6: {
        fontSize: 18,
        fontFamily: FONT,
        fontWeight:'500',
        color: Colors.general_title_font_color,
        opacity:1,
      },

      general_title7: {
        fontSize: 16,
        fontFamily: FONT,
        fontWeight:'500',
        color: Colors.general_title_font_color,
        opacity:1,
      },

      general_title8: {
        fontSize: 18,
        fontFamily: FONT,
        color: Colors.general_title_font_color,
        fontWeight:'500', 
      },


      general_title9: {
        fontSize: 18,
        fontFamily: FONT,
        fontWeight:'500',
        alignSelf:'center',
        color: Colors.general_title_font_color,
      },

      general_title10: {
        fontSize: 16,
        fontFamily: FONT,
        fontWeight:'500',
        color: Colors.general_title_font_color,
      },

      text_value_wrapper : {
        alignItems: 'flex-start',
      },

      text_value_selected : {
        fontSize: 15,
        fontFamily: FONT,
        color: Colors.secondary,
        margin: 5,
        fontFamily:FONT
      },

      text_value_medium : {
        fontSize: 16,
        fontFamily: FONT,
        color: Colors.value_text_color,
        margin: 5,
        fontFamily:FONT
      },

      text_value : {
        fontSize: 14,
        fontFamily: FONT,
        color: Colors.value_text_color,
        margin: 5,
        fontFamily:FONT
      },

      text_value_inside_list_item : {
        fontSize: 14,
        fontFamily: FONT,
        color: Colors.value_text_color,
        margin: 5,
        fontFamily:FONT
      },

      text_value_small : {
        fontSize: 12,
        fontFamily: FONT,
        color: Colors.value_text_color,
        margin: 2,
        fontFamily:FONT
      },

      general_subtitle: {
        fontSize: 12,
        fontFamily: FONT,
        color: Colors.subtitle_color_tmb,
        fontFamily:FONT
      },


      general_subtitle4: {
        fontSize: 12,
        fontFamily: FONT,
        color: Colors.secondary,
        margin:2
      },

      general_subtitle5: {
        fontSize: 12,
        fontFamily: FONT,
        color: Colors.subtitle_font_color,
      },

      general_subtitle6: {
        fontSize: 12,
        fontFamily: FONT,
        opacity:1,
        color: Colors.subtitle_font_color,
      },

      general_subtitle7: {
        fontSize: 11,
        fontFamily: FONT,
        color: Colors.subtitle_font_color,
      },

      general_subtitle8: {
        fontSize:10,
        fontFamily: FONT,
        color: Colors.subtitle_font_color,
      },



      item_date: {
        fontSize: 12,
        fontFamily: FONT,
        color: Colors.item_date_color,
        marginVertical: 5,
      },

      inner_item_single_text: {
        fontSize: 10,
        fontFamily: FONT,
        color: Colors.inner_item_single_text_color,
        marginVertical:2,
      },

      borderStyleHighLighted: {
        borderColor: Colors.primary,
      },

      underlineStyleBase: {
        width: 30,
        height: 45,
        borderWidth: 0,
        borderBottomWidth: 1,
        borderBottomColor:Colors.primary,
        color: Colors.primary,
        fontWeight: 'bold'
      },
    

})

