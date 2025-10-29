import React from 'react';
import { IonPage, IonContent } from '@ionic/react';
import Header from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import Footer from '@/components/Footer';
import '../styles/tuenti-dashboard.css';

const People: React.FC = () => {
  return (
    <IonPage>
      <Header />
      <IonContent className="dashboard-container">
        <div className="dashboard-content">
          <div className="tuenti-layout">
            <div className="tuenti-left-sidebar">
              <div className="dashboard-sidebar">
                <LeftSidebar />
              </div>
            </div>
            <div className="tuenti-main-content">
              <div className="dashboard-main-content">
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <h2>Gente</h2>
                  <p>Esta página está en desarrollo. Aquí podrás encontrar y conectar con otras personas.</p>
                </div>
              </div>
            </div>
            <div className="tuenti-right-sidebar">
              <div className="dashboard-sidebar">
                <RightSidebar />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </IonContent>
    </IonPage>
  );
};

export default People;