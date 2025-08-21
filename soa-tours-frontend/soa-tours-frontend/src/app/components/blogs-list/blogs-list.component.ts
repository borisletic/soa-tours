import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface Blog {
  id: string;
  title: string;
  description: string;
  author_id: number;
  images?: string[];
  likes?: number[];
  comments?: Comment[];
  created_at: string;
  updated_at: string;
}

interface Comment {
  user_id: number;
  text: string;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-blogs-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container py-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2 class="text-white mb-0">
          <i class="fas fa-blog me-2"></i>
          Blogovi
        </h2>
        
        <div>
          <button 
            class="btn btn-success me-2"
            routerLink="/blogs/create"
            *ngIf="isLoggedIn()"
          >
            <i class="fas fa-plus me-1"></i>
            Novi blog
          </button>
          
          <button 
            class="btn btn-outline-light"
            (click)="loadBlogs()"
            [disabled]="isLoading()"
          >
            <i class="fas fa-sync-alt me-1"></i>
            {{ isLoading() ? 'Učitavanje...' : 'Osvezi' }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading() && blogs().length === 0" class="text-center py-5">
        <div class="spinner-border text-light" role="status">
          <span class="visually-hidden">Učitavanje...</span>
        </div>
        <p class="mt-2 text-light">Učitavanje blogova...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage()" class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>
        {{ errorMessage() }}
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading() && blogs().length === 0 && !errorMessage()" class="text-center py-5">
        <div class="card">
          <div class="card-body">
            <i class="fas fa-blog fa-3x text-muted mb-3"></i>
            <h5>Nema blogova</h5>
            <p class="text-muted">Budite prvi koji će kreirati blog!</p>
            <button 
              class="btn btn-primary"
              routerLink="/blogs/create"
              *ngIf="isLoggedIn()"
            >
              <i class="fas fa-plus me-1"></i>
              Kreiraj prvi blog
            </button>
          </div>
        </div>
      </div>

      <!-- Blogs Grid -->
      <div class="row" *ngIf="blogs().length > 0">
        <div 
          *ngFor="let blog of blogs()" 
          class="col-md-6 col-lg-4 mb-4"
        >
          <div class="card h-100 blog-card">
            <!-- Blog Image -->
            <div class="blog-image-container" *ngIf="blog.images && blog.images.length > 0">
              <img 
                [src]="blog.images[0]" 
                class="card-img-top blog-image"
                [alt]="blog.title"
                (error)="onImageError($event)"
              />
            </div>
            
            <div class="card-body d-flex flex-column">
              <!-- Title -->
              <h5 class="card-title">{{ blog.title }}</h5>
              
              <!-- Description Preview -->
              <p class="card-text flex-grow-1">
                {{ getDescriptionPreview(blog.description) }}
              </p>
              
              <!-- Meta Info -->
              <div class="blog-meta">
                <small class="text-muted">
                  <i class="fas fa-calendar-alt me-1"></i>
                  {{ formatDate(blog.created_at) }}
                </small>
                <br>
                <small class="text-muted">
                  <i class="fas fa-user me-1"></i>
                  Autor ID: {{ blog.author_id }}
                </small>
              </div>

              <!-- Stats -->
              <div class="blog-stats mt-2">
                <span class="badge bg-primary me-2">
                  <i class="fas fa-heart me-1"></i>
                  {{ blog.likes?.length || 0 }}
                </span>
                <span class="badge bg-info">
                  <i class="fas fa-comment me-1"></i>
                  {{ blog.comments?.length || 0 }}
                </span>
              </div>

              <!-- Actions -->
              <div class="blog-actions mt-3">
                <button 
                  class="btn btn-outline-primary btn-sm me-2"
                  (click)="viewBlog(blog)"
                >
                  <i class="fas fa-eye me-1"></i>
                  Pogledaj
                </button>
                
                <button 
                  class="btn btn-outline-danger btn-sm"
                  (click)="toggleLike(blog)"
                  [class.btn-danger]="isLikedByCurrentUser(blog)"
                  *ngIf="isLoggedIn()"
                >
                  <i class="fas fa-heart me-1"></i>
                  {{ isLikedByCurrentUser(blog) ? 'Ukloni' : 'Sviđa mi se' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <nav *ngIf="pagination() && pagination().total_pages > 1" class="mt-4">
        <ul class="pagination justify-content-center">
          <li class="page-item" [class.disabled]="pagination().page <= 1">
            <button 
              class="page-link"
              (click)="loadPage(pagination().page - 1)"
              [disabled]="pagination().page <= 1"
            >
              Prethodna
            </button>
          </li>
          
          <li 
            *ngFor="let page of getPageNumbers()" 
            class="page-item"
            [class.active]="page === pagination().page"
          >
            <button 
              class="page-link"
              (click)="loadPage(page)"
            >
              {{ page }}
            </button>
          </li>
          
          <li class="page-item" [class.disabled]="pagination().page >= pagination().total_pages">
            <button 
              class="page-link"
              (click)="loadPage(pagination().page + 1)"
              [disabled]="pagination().page >= pagination().total_pages"
            >
              Sledeća
            </button>
          </li>
        </ul>
      </nav>
    </div>

    <!-- Blog Detail Modal -->
    <div class="modal fade" id="blogModal" tabindex="-1" *ngIf="selectedBlog()">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ selectedBlog()?.title }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <!-- Blog Images -->
            <div *ngIf="(selectedBlog()?.images?.length ?? 0) > 0" class="mb-3">
              <div class="row">
                <div 
                  *ngFor="let image of selectedBlog()?.images" 
                  class="col-md-6 mb-2"
                >
                  <img 
                    [src]="image" 
                    class="img-fluid rounded"
                    [alt]="selectedBlog()?.title"
                    (error)="onImageError($event)"
                  />
                </div>
              </div>
            </div>
            
            <!-- Blog Content -->
            <div class="blog-content">
              {{ selectedBlog()?.description }}
            </div>
            
            <!-- Meta -->
            <hr>
            <div class="d-flex justify-content-between text-muted">
              <small>
                <i class="fas fa-calendar me-1"></i>
                {{ formatDate(selectedBlog()?.created_at ?? '') }}
              </small>
              <small>
                <i class="fas fa-user me-1"></i>
                Autor ID: {{ selectedBlog()?.author_id }}
              </small>
            </div>
          </div>
          <div class="modal-footer">
            <button 
              type="button" 
              class="btn btn-outline-danger"
              (click)="toggleLike(selectedBlog()!)"
              [class.btn-danger]="isLikedByCurrentUser(selectedBlog()!)"
              *ngIf="isLoggedIn()"
            >
              <i class="fas fa-heart me-1"></i>
              {{ isLikedByCurrentUser(selectedBlog()!) ? 'Ukloni like' : 'Sviđa mi se' }}
            </button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              Zatvori
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .blog-card {
      transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
      border: none;
      border-radius: 15px;
    }
    
    .blog-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    
    .blog-image-container {
      height: 200px;
      overflow: hidden;
      border-radius: 15px 15px 0 0;
    }
    
    .blog-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    
    .blog-card:hover .blog-image {
      transform: scale(1.05);
    }
    
    .blog-meta {
      border-top: 1px solid #eee;
      padding-top: 0.5rem;
      margin-top: 0.5rem;
    }
    
    .blog-stats .badge {
      font-size: 0.75rem;
    }
    
    .blog-content {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    
    .btn-primary {
      background: linear-gradient(45deg, #0d6efd, #6610f2);
      border: none;
    }
    
    .btn-success {
      background: linear-gradient(45deg, #198754, #20c997);
      border: none;
    }
    
    .page-link {
      border-radius: 8px;
      margin: 0 2px;
      border: none;
    }
    
    .page-item.active .page-link {
      background: linear-gradient(45deg, #0d6efd, #6610f2);
      border: none;
    }
  `]
})
export class BlogsListComponent implements OnInit {
  blogs = signal<Blog[]>([]);
  pagination = signal<any>(null);
  isLoading = signal(false);
  errorMessage = signal('');
  selectedBlog = signal<Blog | null>(null);

  private readonly CONTENT_API = 'http://localhost:8082';
  private currentPage = 1;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadBlogs();
  }

  loadBlogs(): void {
    this.loadPage(this.currentPage);
  }

  loadPage(page: number): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.currentPage = page;

    this.http.get<{blogs: Blog[], pagination: any}>(`${this.CONTENT_API}/blogs?page=${page}&limit=9`)
      .subscribe({
        next: (response) => {
          this.blogs.set(response.blogs || []);
          this.pagination.set(response.pagination || null);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.isLoading.set(false);
          if (error.error?.error) {
            this.errorMessage.set(error.error.error);
          } else {
            this.errorMessage.set('Greška prilikom učitavanja blogova.');
          }
        }
      });
  }

  viewBlog(blog: Blog): void {
  this.selectedBlog.set(blog);
  
  // Dodaj timeout da se osigura da je DOM spreman
  setTimeout(() => {
    const modalElement = document.getElementById('blogModal');
    if (modalElement) {
      const bootstrap = (window as any).bootstrap;
      if (bootstrap && bootstrap.Modal) {
        // Ukloni postojeću instancu ako postoji
        const existingModal = bootstrap.Modal.getInstance(modalElement);
        if (existingModal) {
          existingModal.dispose();
        }
        
        // Kreiraj novu instancu sa default konfigurацијом
        const modal = new bootstrap.Modal(modalElement, {
          backdrop: true,
          keyboard: true,
          focus: true
        });
        modal.show();
      } else {
        // Fallback - use simple alert if Bootstrap is not available
        alert(`${blog.title}\n\n${blog.description}`);
      }
    }
  }, 100);
}

  toggleLike(blog: Blog): void {
    if (!this.isLoggedIn()) return;

    const currentUser = this.getCurrentUser();
    const isLiked = this.isLikedByCurrentUser(blog);
    const method = isLiked ? 'DELETE' : 'POST';
    const headers = { 'X-User-ID': currentUser.id.toString() };

    this.http.request(method, `${this.CONTENT_API}/blogs/${blog.id}/like`, { headers })
      .subscribe({
        next: () => {
          // Update local state
          if (isLiked) {
            blog.likes = (blog.likes ?? []).filter(id => id !== currentUser.id);
          } else {
            blog.likes = (blog.likes ?? []);
            blog.likes.push(currentUser.id);
          }
          
          // Update selected blog if it's the same
          if (this.selectedBlog()?.id === blog.id) {
            this.selectedBlog.set(blog);
          }
        },
        error: (error) => {
          console.error('Error toggling like:', error);
        }
      });
  }

  isLikedByCurrentUser(blog: Blog): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser && blog.likes?.includes(currentUser.id);
  }

  getDescriptionPreview(description: string): string {
    if (!description) return '';
    return description.length > 150 ? description.substring(0, 150) + '...' : description;
  }

  formatDate(dateString: string): string {
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

  getPageNumbers(): number[] {
    const pagination = this.pagination();
    if (!pagination) return [];
    
    const totalPages = pagination.total_pages;
    const currentPage = pagination.page;
    const pages: number[] = [];
    
    // Show max 5 pages
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    
    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('currentUser');
  }

  private getCurrentUser(): any {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  }

  onImageError(event: any): void {
    event.target.style.display = 'none';
  }
}