import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { UsersComponent } from './components/users/users.component';
import { RegisterComponent } from './components/register/register.component';
import { LoginComponent } from './components/login/login.component';
import { ProfileComponent } from './components/profile/profile.component';

export const routes: Routes = [
  { 
    path: '', 
    component: DashboardComponent,
    title: 'SOA Tours - Dashboard'
  },
  { 
    path: 'users', 
    component: UsersComponent,
    title: 'SOA Tours - Korisnici'
  },
  { 
    path: 'register', 
    component: RegisterComponent,
    title: 'SOA Tours - Registracija'
  },
  { 
    path: 'login', 
    component: LoginComponent,
    title: 'SOA Tours - Prijava'
  },
  { 
    path: 'profile/:id', 
    component: ProfileComponent,
    title: 'SOA Tours - Profil'
  },
  { 
    path: '**', 
    redirectTo: '' 
  }
];