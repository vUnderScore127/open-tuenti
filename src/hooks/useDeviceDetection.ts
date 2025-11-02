// useDeviceDetection.ts - Hook para detectar si el usuario está en móvil o desktop

import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  userAgent: string;
}

export const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: 0,
    userAgent: ''
  });

  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const screenWidth = window.innerWidth;

      // Detectar móvil por User Agent
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      const tabletRegex = /ipad|android(?!.*mobile)|tablet/i;
      
      // Detectar por ancho de pantalla
      const isMobileByWidth = screenWidth <= 768;
      const isTabletByWidth = screenWidth > 768 && screenWidth <= 1024;
      
      // Combinar detección por User Agent y ancho de pantalla
      const isMobileUA = mobileRegex.test(userAgent);
      const isTabletUA = tabletRegex.test(userAgent);
      
      const isMobile = isMobileUA || (isMobileByWidth && !isTabletUA);
      const isTablet = isTabletUA || (isTabletByWidth && !isMobileUA);
      const isDesktop = !isMobile && !isTablet;

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        screenWidth,
        userAgent
      });
    };

    // Detectar al cargar
    detectDevice();

    // Detectar al cambiar el tamaño de ventana
    const handleResize = () => {
      detectDevice();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return deviceInfo;
};

// Hook simplificado que solo retorna si es móvil
export const useIsMobile = (): boolean => {
  const { isMobile } = useDeviceDetection();
  return isMobile;
};