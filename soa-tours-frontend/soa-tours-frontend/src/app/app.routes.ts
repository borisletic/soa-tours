import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'users',
    loadComponent: () => import('./components/users/users.component').then(m => m.UsersComponent)
  },
  {
    path: 'blogs',
    loadComponent: () => import('./components/blogs/blogs.component').then(m => m.BlogsComponent)
  },
  {
    path: 'tours',
    loadComponent: () => import('./components/tours/tours.component').then(m => m.ToursComponent)
  },
  {
    path: 'cart',
    loadComponent: () => import('./components/cart/cart.component').then(m => m.CartComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];