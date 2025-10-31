import { Route, Switch, Redirect, BrowserRouter } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { AuthProvider } from './lib/auth';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import { ChatProvider } from './contexts/ChatContext';
import Profile from './pages/Profile';
import PrivateMessages from './pages/PrivateMessages';
import People from './pages/People';
import Videos from './pages/Videos';
import Games from './pages/Games';
import Admin from './pages/Admin';
import Invite from './pages/Invite';
import Signup from './pages/Signup';
import NeedInvite from './pages/NeedInvite';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <AuthProvider>
      <ChatProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <IonRouterOutlet>
            <Switch>
              <Route exact path="/login" component={Login} />
              <Route exact path="/reset-password" component={ResetPassword} />
              <Route exact path="/dashboard" component={Dashboard} />
              <Route exact path="/settings" component={Settings} />
              <Route exact path="/profile/:userId" component={Profile} />
              <Route exact path="/profile" component={Profile} />
              <Route exact path="/privatemessages" component={PrivateMessages} />
              <Route exact path="/people" component={People} />
              <Route exact path="/videos" component={Videos} />
              <Route exact path="/games" component={Games} />
              <Route exact path="/admin" component={Admin} />
              <Route exact path="/invite/:token" component={Invite} />
              <Route exact path="/signup" component={Signup} />
              <Route exact path="/needinvite" component={NeedInvite} />
              <Route exact path="/">
                <Redirect to="/login" />
              </Route>
            </Switch>
          </IonRouterOutlet>
        </BrowserRouter>
      </ChatProvider>
    </AuthProvider>
  </IonApp>
);

export default App;
