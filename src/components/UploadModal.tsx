import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from './ui/textarea';
import { X, Upload, Image } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { uploadPostImage } from '@/lib/storageService';
import { useAuth } from '@/lib/auth';
import '../styles/tuenti-upload.css';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
  user?: {
    name: string;
    email: string;
    avatar: string;
  };
}

export const UploadModal = ({ isOpen, onClose, user, onPostCreated }: UploadModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Nuevo: entradas estilo Tuenti
  const [basicFiles, setBasicFiles] = useState<(File | null)[]>([null, null, null, null, null]);
  const [multiFiles, setMultiFiles] = useState<File[]>([]);
  const basicRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];
  const multiRef = useRef<HTMLInputElement>(null);
  const { user: authUser } = useAuth();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Solo se permiten archivos de imagen",
          variant: "destructive"
        });
        return;
      }
      
      // Validar tamaño (50MB máximo)
      if (file.size > 52428800) {
        toast({
          title: "Error",
          description: "El archivo es demasiado grande. Máximo 50MB",
          variant: "destructive"
        });
        return;
      }
      
      setSelectedFile(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Validación 10MB e imagen
  const validateImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Sólo imágenes (jpg, png, gif)', variant: 'destructive' });
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Máximo 10MB por imagen', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleBasicSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateImage(file)) {
      const next = [...basicFiles];
      next[index] = file;
      setBasicFiles(next);
    }
  };

  const handleMultiSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(validateImage);
    setMultiFiles(valid);
    // No subir automáticamente: el usuario disparará la subida con el botón
  };

  const handleUpload = async () => {
    if (!selectedFile || !authUser) {
      toast({
        title: "Error",
        description: "Selecciona un archivo para subir",
        variant: "destructive"
      });
      return;
    }

    if (!caption.trim()) {
      toast({
        title: "Error",
        description: "Escribe una descripción para tu post",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Subir imagen al bucket con estructura uuid_usuario/posts/
      const imageUrl = await uploadPostImage(selectedFile, authUser.id);

      // Crear post en la base de datos
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: authUser.id,
          content: caption.trim(),
          image_url: imageUrl,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (postError) {
        throw postError;
      }

      toast({
        title: "¡Éxito!",
        description: "Tu post ha sido publicado correctamente",
      });

      // Insertar registro opcional en media_uploads si existe (para thumbnails en feed)
      try {
        if (post?.id) {
          await supabase
            .from('media_uploads')
            .insert({
              post_id: post.id,
              user_id: authUser.id,
              file_url: imageUrl,
              thumbnail_url: imageUrl,
              file_type: selectedFile.type || 'image/jpeg',
              created_at: new Date().toISOString(),
            });
        }
      } catch (_) {
        // Ignorar si la tabla no existe o falla; el post sigue siendo válido
      }

      // Insertar en tabla photos para estadísticas mínimas
      try {
        await supabase
          .from('photos')
          .insert({
            user_id: authUser.id,
            url: imageUrl,
            created_at: new Date().toISOString()
          });
      } catch (_) {
        // No crítico
      }

      // Limpiar formulario
      setSelectedFile(null);
      setCaption('');
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Cerrar modal y actualizar feed
      onClose();
      if (onPostCreated) {
        onPostCreated();
      }

    } catch (error: any) {
      console.error('Error al crear post:', error);
      toast({
        title: "Error",
        description: error.message || "Error al publicar el post",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Subida en lote (básico o múltiple)
  const uploadImages = async (files: File[]) => {
    if (!authUser) {
      toast({ title: 'Error', description: 'Sesión no disponible', variant: 'destructive' });
      return;
    }
    setIsUploading(true);
    try {
      for (const file of files) {
        const imageUrl = await uploadPostImage(file, authUser.id);
        const { data: post, error: postError } = await supabase
          .from('posts')
          .insert({
            user_id: authUser.id,
            content: caption.trim() || null,
            image_url: imageUrl,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        if (postError) throw postError;
        try {
          await supabase
            .from('media_uploads')
            .insert({
              post_id: post.id,
              user_id: authUser.id,
              file_url: imageUrl,
              thumbnail_url: imageUrl,
              file_type: file.type || 'image/jpeg',
              created_at: new Date().toISOString()
            });
        } catch (_) {}
        try {
          await supabase
            .from('photos')
            .insert({ user_id: authUser.id, url: imageUrl, created_at: new Date().toISOString() });
        } catch (_) {}
      }
      toast({ title: '¡Éxito!', description: 'Imágenes subidas correctamente' });
      setBasicFiles([null, null, null, null, null]);
      setMultiFiles([]);
      basicRefs.forEach(ref => { if (ref.current) ref.current.value = ''; });
      if (multiRef.current) multiRef.current.value = '';
      onClose();
      onPostCreated?.();
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: error.message || 'Falló la subida', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadBasic = async () => {
    const files = basicFiles.filter((f): f is File => !!f);
    if (!files.length) {
      toast({ title: 'Selecciona al menos una imagen', description: 'Usa Examinar…', variant: 'destructive' });
      return;
    }
    await uploadImages(files);
  };

  if (!isOpen) return null;

  return (
    <div className="tuenti-upload-overlay" role="dialog" aria-modal="true">
      <div className="tuenti-upload-modal">
        <div className="tuenti-upload-header">
          <div className="tuenti-upload-breadcrumbs">Subir fotos <span className="sep">&gt;</span> Etiqueta las fotos</div>
          <button className="tuenti-upload-close" onClick={onClose}>Cerrar ✕</button>
        </div>
        <div className="tuenti-upload-body">
          <div className="tuenti-upload-column left">
            <div className="tuenti-upload-column-title">
              <span className="badge">A</span>
              <div>
                <div className="title">Sistema de subida básico</div>
                <div className="subtitle">si sólo quieres subir unas pocas fotos</div>
              </div>
            </div>
            <div className="tuenti-upload-inputs">
              {basicRefs.map((ref, idx) => (
                <div key={idx} className="tuenti-upload-input-row">
                  <input ref={ref} type="file" accept="image/*" onChange={(e) => handleBasicSelect(idx, e)} />
                  <button className="tuenti-upload-browse" onClick={() => ref.current?.click()}>Examinar…</button>
                  <span className="tuenti-upload-filename">{basicFiles[idx]?.name || ''}</span>
                </div>
              ))}
            </div>
            <div className="tuenti-upload-note">Sólo se aceptan imágenes .jpg, .png y .gif de menos de 10 MB</div>
            <div className="tuenti-upload-caption">
              <label>Descripción (opcional)</label>
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} />
            </div>
            <div className="tuenti-upload-actions">
              <button className="tuenti-upload-submit" onClick={handleUploadBasic} disabled={isUploading}>
                {isUploading ? 'Subiendo…' : 'Subir'}
              </button>
            </div>
          </div>
          <div className="tuenti-upload-column right">
            <div className="tuenti-upload-column-title">
              <span className="badge secondary">B</span>
              <div>
                <div className="title">Sistema de subida múltiple</div>
                <div className="subtitle">para subir muchas fotos a la vez</div>
              </div>
            </div>
            <div className="tuenti-upload-description">
              Este sistema es más rápido cuando quieres subir muchas fotos, podrás seleccionar todas tus fotos de golpe y subirlas a tuentis de una sola vez.
            </div>
            <div className="tuenti-upload-multi">
              <input ref={multiRef} type="file" accept="image/*" multiple onChange={handleMultiSelect} />
              <button className="tuenti-upload-multi-button" onClick={() => multiRef.current?.click()} disabled={isUploading}>
                Seleccionar fotos…
              </button>
              <button className="tuenti-upload-submit" style={{ marginLeft: 8 }} onClick={() => uploadImages(multiFiles)} disabled={isUploading || multiFiles.length === 0}>
                {isUploading ? 'Subiendo…' : 'Subir seleccionadas'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};