import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <app-header></app-header>
    <main class="container-fluid">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    main {
      padding-top: 80px;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
  `]
})
export class App {
  protected title = 'SOA Tours';
}