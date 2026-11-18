import { Routes } from '@angular/router';
export const routes: Routes = [
  { path: 'clima', loadComponent: () => import('./pages/dashboard').then(m => m.Dashboard), title: 'El tiempo · Cielo' },
  { path: 'acerca', loadComponent: () => import('./pages/about').then(m => m.About), title: 'Acerca de · Cielo' },
  { path: '', redirectTo: 'clima', pathMatch: 'full' },
  { path: '**', redirectTo: 'clima' }
];
