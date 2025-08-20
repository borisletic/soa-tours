import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div class="container">
      <h1>SOA Tours</h1>
      <p>Welcome to SOA Tours - Your Microservices Tourist Application</p>
      <div class="status">
        <h2>Service Status</h2>
        <ul>
          <li>✅ Frontend Service</li>
          <li>🔄 API Gateway (Port 8080)</li>
          <li>🔄 Stakeholders Service (Port 8081)</li>
          <li>🔄 Content Service (Port 8082)</li>
          <li>🔄 Commerce Service (Port 8083)</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    h1 {
      color: #2c3e50;
      text-align: center;
    }
    .status {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
    }
    ul {
      list-style: none;
      padding: 0;
    }
    li {
      padding: 8px 0;
      font-size: 16px;
    }
  `]
})
export class AppComponent {
  title = 'soa-tours-frontend';
}