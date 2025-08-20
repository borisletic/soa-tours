import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role: 'guide' | 'tourist';
  first_name?: string;
  last_name?: string;
  biography?: string;
  motto?: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-md-8 col-lg-6">
          <div class="card shadow">
            <div class="card-header bg-primary text-white">
              <h4 class="mb-0">
                <i class="fas fa-user-plus me-2"></i>
                Registracija novog korisnika
              </h4>
            </div>
            <div class="card-body">
              <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
                <!-- Osnovni podaci -->
                <div class="mb-4">
                  <h5 class="text-muted border-bottom pb-2">Osnovni podaci</h5>
                  
                  <div class="mb-3">
                    <label for="username" class="form-label">
                      Korisničko ime <span class="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="username"
                      class="form-control"
                      formControlName="username"
                      placeholder="Unesite korisničko ime"
                      [class.is-invalid]="isFieldInvalid('username')"
                    />
                    <div class="invalid-feedback" *ngIf="isFieldInvalid('username')">
                      Korisničko ime je obavezno (3-50 karaktera)
                    </div>
                  </div>

                  <div class="mb-3">
                    <label for="email" class="form-label">
                      Email adresa <span class="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      class="form-control"
                      formControlName="email"
                      placeholder="Unesite email adresu"
                      [class.is-invalid]="isFieldInvalid('email')"
                    />
                    <div class="invalid-feedback" *ngIf="isFieldInvalid('email')">
                      Unesite validnu email adresu
                    </div>
                  </div>

                  <div class="mb-3">
                    <label for="password" class="form-label">
                      Lozinka <span class="text-danger">*</span>
                    </label>
                    <div class="input-group">
                      <input
                        [type]="showPassword() ? 'text' : 'password'"
                        id="password"
                        class="form-control"
                        formControlName="password"
                        placeholder="Unesite lozinku (min. 6 karaktera)"
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
                      Lozinka mora imati najmanje 6 karaktera
                    </div>
                  </div>

                  <div class="mb-3">
                    <label class="form-label">
                      Uloga <span class="text-danger">*</span>
                    </label>
                    <div class="row">
                      <div class="col-6">
                        <div class="form-check">
                          <input
                            class="form-check-input"
                            type="radio"
                            name="role"
                            id="roleGuide"
                            value="guide"
                            formControlName="role"
                          />
                          <label class="form-check-label" for="roleGuide">
                            <i class="fas fa-map-signs text-success me-1"></i>
                            Vodič
                          </label>
                        </div>
                      </div>
                      <div class="col-6">
                        <div class="form-check">
                          <input
                            class="form-check-input"
                            type="radio"
                            name="role"
                            id="roleTourist"
                            value="tourist"
                            formControlName="role"
                          />
                          <label class="form-check-label" for="roleTourist">
                            <i class="fas fa-camera text-info me-1"></i>
                            Turista
                          </label>
                        </div>
                      </div>
                    </div>
                    <div class="text-danger small" *ngIf="isFieldInvalid('role')">
                      Molimo odaberite ulogu
                    </div>
                  </div>
                </div>

                <!-- Profilni podaci (opciono) -->
                <div class="mb-4">
                  <h5 class="text-muted border-bottom pb-2">
                    Profilni podaci (opciono)
                  </h5>
                  
                  <div class="row">
                    <div class="col-md-6 mb-3">
                      <label for="firstName" class="form-label">Ime</label>
                      <input
                        type="text"
                        id="firstName"
                        class="form-control"
                        formControlName="first_name"
                        placeholder="Unesite ime"
                      />
                    </div>
                    <div class="col-md-6 mb-3">
                      <label for="lastName" class="form-label">Prezime</label>
                      <input
                        type="text"
                        id="lastName"
                        class="form-control"
                        formControlName="last_name"
                        placeholder="Unesite prezime"
                      />
                    </div>
                  </div>

                  <div class="mb-3">
                    <label for="biography" class="form-label">Biografija</label>
                    <textarea
                      id="biography"
                      class="form-control"
                      formControlName="biography"
                      rows="3"
                      placeholder="Opišite sebe u nekoliko rečenica..."
                    ></textarea>
                  </div>

                  <div class="mb-3">
                    <label for="motto" class="form-label">Moto/Citat</label>
                    <input
                      type="text"
                      id="motto"
                      class="form-control"
                      formControlName="motto"
                      placeholder="Vaš omiljeni citat ili moto"
                    />
                  </div>
                </div>

                <!-- Dugmad -->
                <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                  <button type="button" class="btn btn-outline-secondary" (click)="onCancel()">
                    <i class="fas fa-times me-1"></i>
                    Otkaži
                  </button>
                  <button
                    type="submit"
                    class="btn btn-primary"
                    [disabled]="registerForm.invalid || isLoading()"
                  >
                    <span *ngIf="isLoading()" class="spinner-border spinner-border-sm me-2"></span>
                    <i class="fas fa-user-plus me-1" *ngIf="!isLoading()"></i>
                    {{ isLoading() ? 'Registruje se...' : 'Registruj se' }}
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
              Već imate nalog? 
              <a href="#" class="text-decoration-none" (click)="goToLogin()">
                Prijavite se ovde
              </a>
            </p>
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
    
    .form-check-input:checked {
      background-color: #0d6efd;
      border-color: #0d6efd;
    }
    
    .btn-primary {
      background: linear-gradient(45deg, #0d6efd, #6610f2);
      border: none;
    }
    
    .btn-primary:hover {
      background: linear-gradient(45deg, #0b5ed7, #520dc2);
    }
    
    .text-muted.border-bottom {
      border-color: #dee2e6 !important;
    }
    
    .spinner-border-sm {
      width: 1rem;
      height: 1rem;
    }
  `]
})
export class RegisterComponent {
  registerForm: FormGroup;
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
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['', Validators.required],
      first_name: [''],
      last_name: [''],
      biography: [''],
      motto: ['']
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  togglePassword(): void {
    this.showPassword.update(show => !show);
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');
      this.successMessage.set('');

      const registerData: RegisterRequest = this.registerForm.value;

      this.http.post(`${this.STAKEHOLDERS_API}/auth/register`, registerData)
        .subscribe({
          next: (response: any) => {
            this.isLoading.set(false);
            this.successMessage.set('Uspešno ste se registrovali! Možete se sada prijaviti.');
            
            // Reset form
            this.registerForm.reset();
            
            // Redirect to login after 2 seconds
            setTimeout(() => {
              this.goToLogin();
            }, 2000);
          },
          error: (error) => {
            this.isLoading.set(false);
            if (error.status === 409) {
              this.errorMessage.set('Korisnik sa ovim korisničkim imenom ili email adresom već postoji.');
            } else if (error.error?.error) {
              this.errorMessage.set(error.error.error);
            } else {
              this.errorMessage.set('Došlo je do greške prilikom registracije. Pokušajte ponovo.');
            }
          }
        });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}