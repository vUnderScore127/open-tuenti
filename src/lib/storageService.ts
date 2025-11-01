import { supabase } from './supabase';

export const BUCKET_NAME = 'tuentibucket';
const MAX_FILE_SIZE = 52428800; // 50MB en bytes

// Función para generar nombre único de archivo
const generateUniqueFileName = (originalName: string, userId: string): string => {
  const fileExt = originalName.split('.').pop();
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  return `${userId}/posts/${timestamp}_${randomId}.${fileExt}`;
};

// Función para comprimir imagen
const compressImage = (file: File, maxWidth: number = 1920, quality: number = 0.95): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // Calcular nuevas dimensiones manteniendo proporción
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Dibujar imagen redimensionada
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convertir a blob
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          resolve(compressedFile);
        } else {
          resolve(file);
        }
      }, file.type, quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Función para comprimir avatar con mayor calidad
const compressAvatar = (file: File, maxWidth: number = 800, quality: number = 0.98): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // Mantener proporción cuadrada para avatares
      const size = Math.min(img.width, img.height);
      const finalSize = Math.min(size, maxWidth);
      
      canvas.width = finalSize;
      canvas.height = finalSize;
      
      // Centrar la imagen si no es cuadrada
      const offsetX = (img.width - size) / 2;
      const offsetY = (img.height - size) / 2;
      
      // Dibujar imagen centrada y cuadrada
      ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, finalSize, finalSize);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          resolve(compressedFile);
        } else {
          resolve(file);
        }
      }, file.type, quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Función principal para subir imagen de post
export const uploadPostImage = async (file: File, userId: string): Promise<string> => {
  try {
    // Validar tamaño de archivo
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`El archivo es demasiado grande. Máximo permitido: 50MB. Tamaño actual: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Comprimir imagen con mayor calidad
    const compressedFile = await compressImage(file, 1920, 0.95);
    
    // Generar ruta del archivo: uuid_usuario/posts/archivo
    const filePath = generateUniqueFileName(file.name, userId);
    
    console.log(`🚀 Subiendo imagen de post: ${file.name} -> ${filePath}`);
    
    // Subir archivo al bucket
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, compressedFile);
    
    if (uploadError) {
      throw uploadError;
    }
    
    // Obtener URL pública
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    console.log(`✅ Imagen subida exitosamente: ${data.publicUrl}`);
    return data.publicUrl;
    
  } catch (error: any) {
    console.error('❌ Error subiendo imagen de post:', error);
    throw error;
  }
};

// Función para eliminar imagen de post
export const deletePostImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extraer path del archivo de la URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(-3).join('/'); // usuario/posts/archivo
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);
    
    if (error) {
      throw error;
    }
    
    console.log(`🗑️ Imagen eliminada: ${filePath}`);
  } catch (error: any) {
    console.error('❌ Error eliminando imagen:', error);
    throw error;
  }
};