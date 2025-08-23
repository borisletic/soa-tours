import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { UsersComponent } from './components/users/users.component';
import { RegisterComponent } from './components/register/register.component';
import { LoginComponent } from './components/login/login.component';
import { ProfileComponent } from './components/profile/profile.component';
import { BlogsListComponent } from './components/blogs-list/blogs-list.component';
import { CreateBlogComponent } from './components/create-blog/create-blog.component';
import { EnhancedBlogsComponent } from './components/enhanced-blogs/enhanced-blogs.component';
import { FollowComponent } from './components/follow/follow.component';
import { MyToursComponent } from './components/my-tours/my-tours.component';
import { CreateTourComponent } from './components/create-tour/create-tour.component';
import { PositionSimulatorComponent } from './components/position-simulator/position-simulator.component';
import { TourExecutionComponent } from './components/tour-execution/tour-execution.component';

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
  // PREMESTITE OVE RUTE IZNAD WILDCARD RUTE:
  { 
    path: 'follow', 
    component: FollowComponent,
    title: 'SOA Tours - Follow System'
  },
  { 
    path: 'enhanced-blogs', 
    component: EnhancedBlogsComponent,
    title: 'SOA Tours - Enhanced Blogs'
  },
  { path: 'create-tour', component: CreateTourComponent, title: 'Create Tour' },
  { path: 'my-tours', component: MyToursComponent, title: 'My Tours' },
  { 
    path: 'position-simulator', 
    component: PositionSimulatorComponent,
    title: 'SOA Tours - Position Simulator'
  },
  { 
    path: 'tour-execution/:id', 
    component: TourExecutionComponent,
    title: 'SOA Tours - Tour Execution'
  },
  // WILDCARD RUTA MORA BITI POSLEDNJA:
  { 
    path: '**', 
    redirectTo: '' 
  }
];