import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  message: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-md-6 col-lg-4">
          <div class="card shadow">
            <div class="card-header bg-primary text-white text-center">
              <h4 class="mb-0">
                <i class="fas fa-sign-in-alt me-2"></i>
                Prijava
              </h4>
            </div>
            <div class="card-body">
              <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
                <div class="mb-3">
                  <label for="username" class="form-label">
                    Korisničko ime
                  </label>
                  <div class="input-group">
                    <span class="input-group-text">
                      <i class="fas fa-user"></i>
                    </span>
                    <input
                      type="text"
                      id="username"
                      class="form-control"
                      formControlName="username"
                      placeholder="Unesite korisničko ime"
                      [class.is-invalid]="isFieldInvalid('username')"
                    />
                  </div>
                  <div class="invalid-feedback" *ngIf="isFieldInvalid('username')">
                    Korisničko ime je obavezno
                  </div>
                </div>

                <div class="mb-3">
                  <label for="password" class="form-label">
                    Lozinka
                  </label>
                  <div class="input-group">
                    <span class="input-group-text">
                      <i class="fas fa-lock"></i>
                    </span>
                    <input
                      [type]="showPassword() ? 'text' : 'password'"
                      id="password"
                      class="form-control"
                      formControlName="password"
                      placeholder="Unesite lozinku"
                      [class.is-invalid]="isFieldInvalid('password')"
                    />
                    <button
                      type="button"
                      class="btn btn-outline-secondary"
                      (click)="togglePassword()"
                    >
                      <i [class]="showPassword() ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                    </button>
                  </div>
                  <div class="invalid-feedback" *ngIf="isFieldInvalid('password')">
                    Lozinka je obavezna
                  </div>
                </div>

                <div class="d-grid gap-2">
                  <button
                    type="submit"
                    class="btn btn-primary"
                    [disabled]="loginForm.invalid || isLoading()"
                  >
                    <span *ngIf="isLoading()" class="spinner-border spinner-border-sm me-2"></span>
                    <i class="fas fa-sign-in-alt me-1" *ngIf="!isLoading()"></i>
                    {{ isLoading() ? 'Prijavljivanje...' : 'Prijavite se' }}
                  </button>
                </div>
              </form>

              <!-- Alert poruke -->
              <div *ngIf="errorMessage()" class="alert alert-danger mt-3">
                <i class="fas fa-exclamation-triangle me-2"></i>
                {{ errorMessage() }}
              </div>

              <div *ngIf="successMessage()" class="alert alert-success mt-3">
                <i class="fas fa-check-circle me-2"></i>
                {{ successMessage() }}
              </div>
            </div>
          </div>

          <div class="text-center mt-3">
            <p class="text-muted">
              Nemate nalog? 
              <a href="#" class="text-decoration-none" (click)="goToRegister()">
                Registrujte se ovde
              </a>
            </p>
          </div>

          <!-- Demo korisnici -->
          <div class="card mt-3">
            <div class="card-header bg-light">
              <h6 class="mb-0">
                <i class="fas fa-info-circle me-2"></i>
                Demo korisnici
              </h6>
            </div>
            <div class="card-body">
              <small class="text-muted">
                Za testiranje možete koristiti:
              </small>
              <div class="mt-2">
                <button 
                  type="button" 
                  class="btn btn-outline-primary btn-sm me-2 mb-1"
                  (click)="fillDemoUser('admin')"
                >
                  Admin
                </button>
                <button 
                  type="button" 
                  class="btn btn-outline-success btn-sm me-2 mb-1"
                  (click)="fillDemoUser('guide1')"
                >
                  Vodič
                </button>
                <button 
                  type="button" 
                  class="btn btn-outline-info btn-sm mb-1"
                  (click)="fillDemoUser('tourist1')"
                >
                  Turista
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      border: none;
      border-radius: 10px;
    }
    
    .card-header {
      border-radius: 10px 10px 0 0 !important;
    }
    
    .form-control:focus {
      border-color: #0d6efd;
      box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
    }
    
    .btn-primary {
      background: linear-gradient(45deg, #0d6efd, #6610f2);
      border: none;
    }
    
    .btn-primary:hover {
      background: linear-gradient(45deg, #0b5ed7, #520dc2);
    }
    
    .input-group-text {
      background-color: #f8f9fa;
      border-color: #ced4da;
    }
    
    .spinner-border-sm {
      width: 1rem;
      height: 1rem;
    }
    
    .btn-sm {
      font-size: 0.775rem;
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  showPassword = signal(false);

  private readonly STAKEHOLDERS_API = 'http://localhost:8081';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  togglePassword(): void {
    this.showPassword.update(show => !show);
  }

  fillDemoUser(userType: string): void {
    const demoUsers = {
      admin: { username: 'admin', password: 'admin123' },
      guide1: { username: 'guide1', password: 'admin123' },
      tourist1: { username: 'tourist1', password: 'admin123' }
    };

    const user = demoUsers[userType as keyof typeof demoUsers];
    if (user) {
      this.loginForm.patchValue(user);
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');
      this.successMessage.set('');

      const loginData: LoginRequest = this.loginForm.value;

      this.http.post<LoginResponse>(`${this.STAKEHOLDERS_API}/auth/login`, loginData)
        .subscribe({
          next: (response) => {
            this.isLoading.set(false);
            this.successMessage.set(`Dobrodošli, ${response.user.username}!`);
            
            // Store user data in localStorage
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            
            // Redirect based on role
            setTimeout(() => {
              if (response.user.role === 'admin') {
                this.router.navigate(['/admin']);
              } else {
                this.router.navigate(['/profile', response.user.id]);
              }
            }, 1000);
          },
          error: (error) => {
            this.isLoading.set(false);
            if (error.status === 401) {
              this.errorMessage.set('Neispravno korisničko ime ili lozinka.');
            } else if (error.status === 403) {
              this.errorMessage.set('Vaš nalog je blokiran. Kontaktirajte administratora.');
            } else if (error.error?.error) {
              this.errorMessage.set(error.error.error);
            } else {
              this.errorMessage.set('Došlo je do greške prilikom prijave. Pokušajte ponovo.');
            }
          }
        });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}