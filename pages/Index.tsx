
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ProfileSidebar } from "@/components/ProfileSidebar";
import { MainContent } from "@/components/MainContent";
import { RightSidebar } from "@/components/RightSidebar";

const Index = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([
    {
      id: "550e8400-e29b-41d4-a716-446655440001", // UUID válido
      user: "María García",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
      time: "hace 2 horas",
      content: "1 foto etiquetada",
      likes: 12,
      comments: 3,
      isLiked: false,
      image: "https://images.unsplash.com/photo-1721322800607-8c38375eef04?w=300&h=200&fit=crop"
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440002", // UUID válido
      user: "Carlos Mendoza", 
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
      time: "hace 4 horas",
      content: "2 amigos conectados - Juan, Pedro",
      likes: 8,
      comments: 1,
      isLiked: false
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440003", // Cambiar de number a string UUID
      user: "Ana Martín",
      avatar: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=100&h=100&fit=crop&crop=face", 
      time: "hace 6 horas",
      content: "1 amigo conectado",
      likes: 15,
      comments: 5,
      isLiked: false
    }
  ]);

  useEffect(() => {
    // Verificar si hay tokens de recovery en la URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    if (accessToken && type === 'recovery') {
      // Redirigir a la página de reset password
      navigate('/reset-password');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <ProfileSidebar />
          <MainContent posts={posts} setPosts={setPosts} />
          <RightSidebar />
        </div>
      </div>
    </div>
  );
};

export default Index;
