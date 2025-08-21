import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { UsersComponent } from './components/users/users.component';
import { RegisterComponent } from './components/register/register.component';
import { LoginComponent } from './components/login/login.component';
import { ProfileComponent } from './components/profile/profile.component';
import { BlogsListComponent } from './components/blogs-list/blogs-list.component';
import { CreateBlogComponent } from './components/create-blog/create-blog.component';

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
    path: 'blogs', 
    component: BlogsListComponent,
    title: 'SOA Tours - Blogovi'
  },
  { 
    path: 'blogs/create', 
    component: CreateBlogComponent,
    title: 'SOA Tours - Kreiraj blog'
  },
  { 
    path: '**', 
    redirectTo: '' 
  }
];