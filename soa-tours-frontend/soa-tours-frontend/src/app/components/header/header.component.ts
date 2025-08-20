import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [RouterModule],
  template: `
    <nav class="navbar navbar-dark bg-dark">
      <div class="container">
        <a class="navbar-brand" routerLink="/">SOA Tours</a>
      </div>
    </nav>
  `
})
export class HeaderComponent {}