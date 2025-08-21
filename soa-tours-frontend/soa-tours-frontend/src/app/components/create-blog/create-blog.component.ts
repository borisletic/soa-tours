import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface CreateBlogRequest {
  title: string;
  description: string;
  images?: string[];
}

@Component({
  selector: 'app-create-blog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container py-4">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="card shadow">
            <div class="card-header bg-gradient-primary text-white">
              <h4 class="mb-0">
                <i class="fas fa-plus-circle me-2"></i>
                Kreiraj novi blog
              </h4>
            </div>
            
            <div class="card-body">
              <form [formGroup]="blogForm" (ngSubmit)="onSubmit()">
                <!-- Naslov -->
                <div class="mb-3">
                  <label for="title" class="form-label">
                    Naslov <span class="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    class="form-control"
                    formControlName="title"
                    placeholder="Unesite naslov bloga"
                    [class.is-invalid]="isFieldInvalid('title')"
                  />
                  <div class="invalid-feedback" *ngIf="isFieldInvalid('title')">
                    Naslov je obavezan (1-200 karaktera)
                  </div>
                </div>

                <!-- Opis -->
                <div class="mb-3">
                  <label for="description" class="form-label">
                    Opis <span class="text-danger">*</span>
                  </label>
                  <textarea
                    id="description"
                    class="form-control"
                    formControlName="description"
                    rows="10"
                    placeholder="Napišite sadržaj bloga... 

Možete koristiti jednostavan tekst ili markdown format:

**Bold tekst**
*Italic tekst*
### Podnaslovi
- Lista stavki
- Još jedna stavka

[Link text](http://example.com)
"
                    [class.is-invalid]="isFieldInvalid('description')"
                  ></textarea>
                  <div class="form-text">
                    Podrška za markdown format je dostupna
                  </div>
                  <div class="invalid-feedback" *ngIf="isFieldInvalid('description')">
                    Opis je obavezan
                  </div>
                </div>

                <!-- Slike -->
                <div class="mb-4">
                  <label class="form-label">
                    Slike (opciono)
                  </label>
                  
                  <div formArrayName="images">
                    <div 
                      *ngFor="let imageControl of imageControls.controls; let i = index"
                      class="input-group mb-2"
                    >
                      <input
                        type="url"
                        class="form-control"
                        [formControlName]="i"
                        placeholder="https://example.com/image.jpg"
                      />
                      <button
                        type="button"
                        class="btn btn-outline-danger"
                        (click)="removeImage(i)"
                        [disabled]="imageControls.length <= 1"
                      >
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    class="btn btn-outline-primary btn-sm"
                    (click)="addImage()"
                  >
                    <i class="fas fa-plus me-1"></i>
                    Dodaj sliku
                  </button>
                  
                  <div class="form-text">
                    Dodajte URL-ove slika koje želite da prikažete u blogu
                  </div>
                </div>

                <!-- Preview -->
                <div class="mb-4" *ngIf="blogForm.get('title')?.value || blogForm.get('description')?.value">
                  <h5 class="text-muted border-bottom pb-2">
                    <i class="fas fa-eye me-1"></i>
                    Preview
                  </h5>
                  
                  <div class="card bg-light">
                    <div class="card-body">
                      <h6 class="card-title" *ngIf="blogForm.get('title')?.value">
                        {{ blogForm.get('title')?.value }}
                      </h6>
                      <div class="card-text" *ngIf="blogForm.get('description')?.value">
                        <div class="blog-preview">{{ blogForm.get('description')?.value }}</div>
                      </div>
                      
                      <div *ngIf="getValidImages().length > 0" class="mt-3">
                        <small class="text-muted">Slike:</small>
                        <div class="row mt-2">
                          <div 
                            *ngFor="let image of getValidImages()" 
                            class="col-md-4 mb-2"
                          >
                            <img 
                              [src]="image" 
                              class="img-thumbnail" 
                              style="max-height: 100px; width: 100%;"
                              (error)="onImageError($event)"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Dugmad -->
                <div class="d-flex gap-2">
                  <button
                    type="submit"
                    class="btn btn-primary"
                    [disabled]="blogForm.invalid || isLoading()"
                  >
                    <span *ngIf="isLoading()" class="spinner-border spinner-border-sm me-2"></span>
                    <i class="fas fa-save me-1" *ngIf="!isLoading()"></i>
                    {{ isLoading() ? 'Kreira se...' : 'Kreiraj blog' }}
                  </button>
                  
                  <button
                    type="button"
                    class="btn btn-outline-secondary"
                    (click)="onCancel()"
                    [disabled]="isLoading()"
                  >
                    <i class="fas fa-times me-1"></i>
                    Otkaži
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
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bg-gradient-primary {
      background: linear-gradient(45deg, #0d6efd, #6610f2);
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
    
    .blog-preview {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    
    .img-thumbnail {
      object-fit: cover;
    }
    
    .input-group .btn {
      z-index: 0;
    }
  `]
})
export class CreateBlogComponent {
  blogForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  private readonly CONTENT_API = 'http://localhost:8082';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.blogForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.minLength(1)]],
      images: this.fb.array([this.fb.control('')])
    });
  }

  get imageControls() {
    return this.blogForm.get('images') as FormArray;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.blogForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  addImage(): void {
    this.imageControls.push(this.fb.control(''));
  }

  removeImage(index: number): void {
    if (this.imageControls.length > 1) {
      this.imageControls.removeAt(index);
    }
  }

  getValidImages(): string[] {
    return this.imageControls.value.filter((url: string) => 
      url && url.trim() !== '' && this.isValidUrl(url)
    );
  }

  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  onImageError(event: any): void {
    event.target.style.display = 'none';
  }

  onSubmit(): void {
    if (this.blogForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');
      this.successMessage.set('');

      const formData = this.blogForm.value;
      const blogData: CreateBlogRequest = {
        title: formData.title,
        description: formData.description,
        images: this.getValidImages()
      };

      // Get current user ID for X-User-ID header
      const currentUser = this.getCurrentUser();
      const headersObj: Record<string, string> = {};
      if (currentUser && currentUser.id) {
        headersObj['X-User-ID'] = currentUser.id.toString();
      }

      this.http.post(`${this.CONTENT_API}/blogs`, blogData, { headers: headersObj })
        .subscribe({
          next: (response: any) => {
            this.isLoading.set(false);
            this.successMessage.set('Blog je uspešno kreiran!');
            
            // Reset form
            this.blogForm.reset();
            this.imageControls.clear();
            this.imageControls.push(this.fb.control(''));
            
            // Redirect to blogs list after 2 seconds
            setTimeout(() => {
              this.router.navigate(['/blogs']);
            }, 2000);
          },
          error: (error) => {
            this.isLoading.set(false);
            if (error.error?.error) {
              this.errorMessage.set(error.error.error);
            } else {
              this.errorMessage.set('Došlo je do greške prilikom kreiranja bloga. Pokušajte ponovo.');
            }
          }
        });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.blogForm.controls).forEach(key => {
        this.blogForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/blogs']);
  }

  private getCurrentUser(): any {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  }
}