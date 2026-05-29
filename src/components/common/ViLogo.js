import React from 'react';
import { Image } from 'react-native';

/**
 * Vi brand logo — renders assets/logo.png at the requested size.
 * Replace assets/logo.png with the official icon PNG to update everywhere at once.
 */
const ViLogo = ({ size = 80 }) => (
  <Image
    source={require('../../../assets/logo.png')}
    style={{ width: size, height: size, resizeMode: 'contain' }}
  />
);

export default ViLogo;
