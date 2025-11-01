import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
  isOpen: boolean;
  imageSrc: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  isOpen,
  imageSrc,
  onCropComplete,
  onCancel
}) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1)); // Aspecto 1:1 para avatar
  }, []);

  const getCroppedImg = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !canvasRef.current) {
      return;
    }
  
    const image = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
  
    if (!ctx) {
      throw new Error('No 2d context');
    }
  
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
  
    // Usar las dimensiones originales escaladas en lugar del tamaño de recorte visible
    const outputWidth = completedCrop.width * scaleX;
    const outputHeight = completedCrop.height * scaleY;
    
    canvas.width = outputWidth;
    canvas.height = outputHeight;
  
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      outputWidth,
      outputHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    );
  
    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        }
      }, 'image/jpeg', 0.8); // Aumentar calidad también
    });
  }, [completedCrop]);

  const handleSave = async () => {
    try {
      const croppedImageBlob = await getCroppedImg();
      if (croppedImageBlob) {
        onCropComplete(croppedImageBlob);
      }
    } catch (error) {
      console.error('Error al recortar imagen:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.18)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff',
        border: '10px solid rgba(0, 0, 0, 0.29)',
        borderRadius: 0,
        boxShadow: '0 2px 16px rgba(0,0,0,0.13)',
        width: 720,     // Aumentar de 620 a 720
        maxWidth: '98vw',
        padding: 0,
        position: 'relative',
      }}>
        {/* Botón X */}
        <button
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#3b7dd8',
            border: '2px solid #fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.07)',
            padding: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="12" fill="#3b7dd8" />
            <line x1="7" y1="7" x2="17" y2="17" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="17" y1="7" x2="7" y2="17" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        </button>
        <div style={{ padding: '32px 32px 24px 32px', textAlign: 'left' }}>
          <h2 style={{
            fontSize: 22,
            fontWeight: 400,
            margin: 0,
            marginBottom: 8,
            color: '#222',
            textAlign: 'left',
          }}>Alinear la foto de perfil</h2>
          <div style={{
            borderBottom: '1.5px solid #e5e5e5',
            marginBottom: 16,
            marginTop: 4,
            width: '100%',
          }} />
          <div style={{
            fontSize: 15,
            marginBottom: 18,
            color: '#222',
            textAlign: 'left',
          }}>
            <span style={{ fontWeight: 700 }}>Tu foto de perfil a veces estará encuadrada.</span> Para recortar la imagen que has seleccionado, arrastra el cuadrado en la imagen.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <div style={{
              background: '#fff',
              border: '1.5px solid #222',
              boxShadow: '0 1px 2px rgba(0,0,0,0.07)',
              padding: 8,
              borderRadius: 0,
              display: 'inline-block',
            }}>
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                minWidth={100}
                minHeight={100}
                style={{ maxWidth: 440 }} // Aumentar de 340 a 440
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imageSrc}
                  onLoad={onImageLoad}
                  style={{
                    maxWidth: 400,    // Aumentar significativamente
                    maxHeight: 400,   // Aumentar significativamente
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    background: '#eee',
                  }}
                />
              </ReactCrop>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={!completedCrop}
            style={{
              color: '#fff',
              fontWeight: 'bold',
              fontSize: 15,
              padding: '7px 28px',
              borderRadius: 4,
              border: '2px solid #396A9D',
              backgroundImage: `url("${import.meta.env.BASE_URL}noise.KmQE111qYh.png"), linear-gradient(to bottom, #5686B5 0%, #4575A6 100%)`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.2)',
              cursor: completedCrop ? 'pointer' : 'not-allowed',
              opacity: completedCrop ? 1 : 0.6,
              outline: 'none',
              transition: 'background 0.2s',
              marginTop: 8,
              marginBottom: 0,
              marginLeft: 0,
              marginRight: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            Guardar
          </button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};