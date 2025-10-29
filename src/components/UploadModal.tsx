import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from './ui/textarea';
import { X, Upload, Image, Video, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { uploadPostImage } from '@/lib/storageService';
import { useAuth } from '@/lib/auth';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Crear nuevo post</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Área de subida de archivo */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-64 mx-auto rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="absolute top-2 right-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  Arrastra una imagen aquí o haz clic para seleccionar
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image className="mr-2 h-4 w-4" />
                  Seleccionar imagen
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Campo de descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Escribe una descripción para tu post..."
              className="min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {caption.length}/500 caracteres
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              className="flex-1"
              disabled={!selectedFile || !caption.trim() || isUploading}
            >
              {isUploading ? 'Publicando...' : 'Publicar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};