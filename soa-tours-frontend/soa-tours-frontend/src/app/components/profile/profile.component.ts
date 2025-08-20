import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  profile_image: string;
  biography: string;
  motto: string;
  created_at: string;
  updated_at: string;
}

interface UserWithProfile {
  user: User;
  profile?: Profile;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container py-4">
      <div class="row">
        <!-- Profile Header -->
        <div class="col-12">
          <div class="card shadow mb-4">
            <div class="card-header bg-gradient-primary text-white">
              <div class="d-flex justify-content-between align-items-center">
                <h4 class="mb-0">
                  <i class="fas fa-user-circle me-2"></i>
                  Profil korisnika
                </h4>
                <div>
                  <button 
                    *ngIf="!isEditing() && canEdit()"
                    class="btn btn-light btn-sm me-2"
                    (click)="toggleEdit()"
                  >
                    <i class="fas fa-edit me-1"></i>
                    Uredi profil
                  </button>
                  <button 
                    class="btn btn-outline-light btn-sm"
                    (click)="goBack()"
                  >
                    <i class="fas fa-arrow-left me-1"></i>
                    Nazad
                  </button>
                </div>
              </div>
            </div>
            
            <div class="card-body" *ngIf="user()">
              <div class="row">
                <div class="col-md-3 text-center">
                  <div class="profile-image-container">
                    <img 
                      [src]="getProfileImage()" 
                      [alt]="getDisplayName()"
                      class="profile-image rounded-circle shadow"
                    />
                    <div class="mt-2">
                      <span class="badge" [class]="getRoleBadgeClass()">
                        <i [class]="getRoleIcon()"></i>
                        {{ getRoleDisplayName() }}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div class="col-md-9">
                  <!-- View Mode -->
                  <div *ngIf="!isEditing()">
                    <h3 class="mb-2">{{ getDisplayName() }}</h3>
                    <p class="text-muted mb-1">
                      <i class="fas fa-at me-1"></i>
                      {{ user()?.username }}
                    </p>
                    <p class="text-muted mb-3">
                      <i class="fas fa-envelope me-1"></i>
                      {{ user()?.email }}
                    </p>
                    
                    <div *ngIf="profile()?.biography" class="mb-3">
                      <h6 class="text-muted">
                        <i class="fas fa-info-circle me-1"></i>
                        Biografija
                      </h6>
                      <p class="mb-0">{{ profile()?.biography }}</p>
                    </div>
                    
                    <div *ngIf="profile()?.motto" class="mb-3">
                      <h6 class="text-muted">
                        <i class="fas fa-quote-left me-1"></i>
                        Moto
                      </h6>
                      <p class="mb-0 fst-italic">
                        "{{ profile()?.motto }}"
                      </p>
                    </div>
                    
                    <div class="row mt-4">
                      <div class="col-sm-6">
                        <small class="text-muted">
                          <i class="fas fa-calendar-plus me-1"></i>
                          Registrovan: {{ formatDate(user()?.created_at) }}
                        </small>
                      </div>
                      <div class="col-sm-6" *ngIf="profile()?.updated_at">
                        <small class="text-muted">
                          <i class="fas fa-calendar-check me-1"></i>
                          Poslednja izmena: {{ formatDate(profile()?.updated_at) }}
                        </small>
                      </div>
                    </div>
                  </div>

                  <!-- Edit Mode -->
                  <div *ngIf="isEditing()">
                    <form [formGroup]="profileForm" (ngSubmit)="onSubmit()">
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
                        <label for="profileImage" class="form-label">URL profilne slike</label>
                        <input
                          type="url"
                          id="profileImage"
                          class="form-control"
                          formControlName="profile_image"
                          placeholder="https://example.com/image.jpg"
                        />
                        <div class="form-text">
                          Unesite URL validne slike ili ostavite prazno za default sliku
                        </div>
                      </div>

                      <div class="mb-3">
                        <label for="biography" class="form-label">Biografija</label>
                        <textarea
                          id="biography"
                          class="form-control"
                          formControlName="biography"
                          rows="4"
                          placeholder="Opišite sebe, svoja iskustva, interesovanja..."
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

                      <div class="d-flex gap-2">
                        <button
                          type="submit"
                          class="btn btn-primary"
                          [disabled]="isLoading()"
                        >
                          <span *ngIf="isLoading()" class="spinner-border spinner-border-sm me-2"></span>
                          <i class="fas fa-save me-1" *ngIf="!isLoading()"></i>
                          {{ isLoading() ? 'Snimanje...' : 'Snimi izmene' }}
                        </button>
                        <button
                          type="button"
                          class="btn btn-outline-secondary"
                          (click)="cancelEdit()"
                          [disabled]="isLoading()"
                        >
                          <i class="fas fa-times me-1"></i>
                          Otkaži
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading() && !user()" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Učitavanje...</span>
        </div>
        <p class="mt-2 text-muted">Učitavanje profila...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage()" class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>
        {{ errorMessage() }}
      </div>

      <!-- Success Message -->
      <div *ngIf="successMessage()" class="alert alert-success">
        <i class="fas fa-check-circle me-2"></i>
        {{ successMessage() }}
      </div>
    </div>
  `,
  styles: [`
    .bg-gradient-primary {
      background: linear-gradient(45deg, #0d6efd, #6610f2);
    }
    
    .profile-image {
      width: 120px;
      height: 120px;
      object-fit: cover;
      border: 4px solid white;
    }
    
    .profile-image-container {
      position: relative;
    }
    
    .card {
      border: none;
      border-radius: 15px;
    }
    
    .card-header {
      border-radius: 15px 15px 0 0 !important;
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
    
    .spinner-border-sm {
      width: 1rem;
      height: 1rem;
    }
    
    .badge {
      font-size: 0.9rem;
    }
  `]
})
export class ProfileComponent implements OnInit {
  user = signal<User | null>(null);
  profile = signal<Profile | null>(null);
  isLoading = signal(false);
  isEditing = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  
  profileForm: FormGroup;
  userId: number = 0;
  currentUser: any = null;

  private readonly STAKEHOLDERS_API = 'http://localhost:8081';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      first_name: [''],
      last_name: [''],
      profile_image: [''],
      biography: [''],
      motto: ['']
    });
  }

  ngOnInit(): void {
    // Get current user from localStorage
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
      this.currentUser = JSON.parse(currentUserStr);
    }

    // Get user ID from route
    this.route.params.subscribe(params => {
      this.userId = +params['id'];
      this.loadUserProfile();
    });
  }

  loadUserProfile(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.http.get<{user: User}>(`${this.STAKEHOLDERS_API}/users/${this.userId}`)
      .subscribe({
        next: (response) => {
          this.user.set(response.user);
          this.loadProfile();
        },
        error: (error) => {
          this.isLoading.set(false);
          if (error.status === 404) {
            this.errorMessage.set('Korisnik nije pronađen.');
          } else {
            this.errorMessage.set('Greška prilikom učitavanja korisnika.');
          }
        }
      });
  }

  loadProfile(): void {
    this.http.get<{profile: Profile}>(`${this.STAKEHOLDERS_API}/users/${this.userId}/profile`)
      .subscribe({
        next: (response) => {
          this.profile.set(response.profile);
          this.isLoading.set(false);
        },
        error: () => {
          // Profile might not exist yet, that's ok
          this.isLoading.set(false);
        }
      });
  }

  canEdit(): boolean {
    return this.currentUser && (
      this.currentUser.role === 'admin' || 
      this.currentUser.id === this.userId
    );
  }

  toggleEdit(): void {
    this.isEditing.set(true);
    this.fillForm();
  }

  fillForm(): void {
    const profileData = this.profile();
    if (profileData) {
      this.profileForm.patchValue({
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        profile_image: profileData.profile_image || '',
        biography: profileData.biography || '',
        motto: profileData.motto || ''
      });
    }
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  onSubmit(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const formData = this.profileForm.value;

    this.http.put(`${this.STAKEHOLDERS_API}/users/${this.userId}/profile`, formData)
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.isEditing.set(false);
          this.successMessage.set('Profil je uspešno ažuriran!');
          this.loadProfile();
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage.set('');
          }, 3000);
        },
        error: (error) => {
          this.isLoading.set(false);
          if (error.error?.error) {
            this.errorMessage.set(error.error.error);
          } else {
            this.errorMessage.set('Greška prilikom ažuriranja profila.');
          }
        }
      });
  }

  getDisplayName(): string {
    const profileData = this.profile();
    const userData = this.user();
    
    if (profileData?.first_name || profileData?.last_name) {
      return `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
    }
    
    return userData?.username || 'Nepoznat korisnik';
  }

  getProfileImage(): string {
    const profileData = this.profile();
    const userData = this.user();
    
    if (profileData?.profile_image) {
      return profileData.profile_image;
    }
    
    // Default avatars based on role
    const role = userData?.role || 'tourist';
    const avatarMap = {
      admin: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin&backgroundColor=b6e3f4',
      guide: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guide&backgroundColor=c0aede',
      tourist: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tourist&backgroundColor=d1d4ed'
    };
    
    return avatarMap[role as keyof typeof avatarMap] || avatarMap.tourist;
  }

  getRoleDisplayName(): string {
    const role = this.user()?.role;
    const roleMap = {
      admin: 'Administrator',
      guide: 'Vodič',
      tourist: 'Turista'
    };
    
    return roleMap[role as keyof typeof roleMap] || 'Nepoznata uloga';
  }

  getRoleBadgeClass(): string {
    const role = this.user()?.role;
    const classMap = {
      admin: 'badge bg-danger',
      guide: 'badge bg-success',
      tourist: 'badge bg-info'
    };
    
    return classMap[role as keyof typeof classMap] || 'badge bg-secondary';
  }

  getRoleIcon(): string {
    const role = this.user()?.role;
    const iconMap = {
      admin: 'fas fa-crown',
      guide: 'fas fa-map-signs',
      tourist: 'fas fa-camera'
    };
    
    return iconMap[role as keyof typeof iconMap] || 'fas fa-user';
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('sr-RS', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}