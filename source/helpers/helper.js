/* eslint-disable prettier/prettier */
/* eslint-disable eol-last */
import React from "react";

import {API_BASE} from '../resources/data/Constants'
import { CHECK_NOT_SELECTED, CHECK_SELECTED, SQUARE_CHECK_NOT_SELECTED, SQUARE_CHECK_SELECTED } from "../resources/data/Images";


const getImageSourceWithFallback = (url, static_image)  => {
    let source_ = null;
    if(url=='' || url == 'null' || url == 'NA' || url == undefined || url == null)
    {
      source_ = static_image;
    }else
    {
      source_ = {uri: url};
    }
    
    return source_;
  };

const getImageSource = (image_)  => {
    let source_ = image_;
    if(typeof(image_) != 'number')
    {
      source_ = {uri:image_}
    }
    return source_;
  };

const getCheckBoxIcon = (flag, max_selectable)  => {
    let source_ = CHECK_NOT_SELECTED;
    if(max_selectable>1)
    {
      source_ = SQUARE_CHECK_NOT_SELECTED;
    }

    if(flag == true )
    {
      if(max_selectable>1)
      {
        source_ = SQUARE_CHECK_SELECTED;
      }else
      {
      source_ = CHECK_SELECTED;
      }
    }
    return source_;
  };

const getCheckStyle = (flag, max_selectable)  => {

     let height_ = 22;
     let width_ = 22;

     if(max_selectable>1)
     {
      height_ = 18;
      width_ = 18;
     }

   

    if(flag == true)
    {
      if(max_selectable>1)
      {
        height_ = 17;
        width_ = 17;
      }else
      {
        height_ = 20;
        width_ = 20;
      }
    }

    style_ = {
      height: height_,
      width: width_,
    };

    return style_;
  };

const getAPIHeader = ()  => {
    const header_ =   {
      headers: {
            'Content-type': 'application/json',
        },

        baseURL: API_BASE,
    };
    return header_;
  };

  const getAPIHeaderGet = ()  => {
    const header_ =   {
        baseURL: API_BASE,
    }
    return header_;
  };




  export {getImageSourceWithFallback, getAPIHeader, getAPIHeaderGet, getCheckBoxIcon, getCheckStyle, getImageSource};
  