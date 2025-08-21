import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface Blog {
  id: string;
  title: string;
  description: string;
  author_id: number;
  images: string[];
  likes: number[];
  comments: Comment[];
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
  selector: 'app-enhanced-blogs',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <h2 class="text-white mb-4">
        <i class="fas fa-blog me-2"></i>Blog Management with Follow System
      </h2>
      
      <!-- Load Blogs Section -->
      <div class="card mb-4">
        <div class="card-body">
          <h5 class="card-title">Real MongoDB Blogs</h5>
          <button 
            class="btn btn-primary" 
            (click)="loadBlogs()" 
            [disabled]="loading()">
            <i class="fas fa-sync-alt me-1"></i>
            {{loading() ? 'Loading...' : 'Load Real Blogs'}}
          </button>
        </div>
      </div>

      <!-- Blogs Display -->
      <div *ngIf="blogs().length > 0">
        <div *ngFor="let blog of blogs()" class="card mb-4">
          <div class="card-body">
            <!-- Blog Header -->
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h5 class="card-title">{{blog.title}}</h5>
                <small class="text-muted">
                  by Author ID: {{blog.author_id}} | 
                  {{formatDate(blog.created_at)}} |
                  Blog ID: {{blog.id}}
                </small>
              </div>
              <div class="btn-group">
                <!-- Follow/Unfollow Button -->
                <button 
                  *ngIf="getCurrentUserId() !== blog.author_id"
                  class="btn btn-sm"
                  [ngClass]="isFollowing(blog.author_id) ? 'btn-success' : 'btn-outline-primary'"
                  (click)="toggleFollow(blog.author_id)"
                  [disabled]="loading()">
                  <i [class]="isFollowing(blog.author_id) ? 'fas fa-user-check' : 'fas fa-user-plus'"></i>
                  {{isFollowing(blog.author_id) ? 'Following' : 'Follow'}}
                </button>
                
                <!-- Like Button -->
                <button 
                  class="btn btn-sm"
                  [ngClass]="hasLiked(blog) ? 'btn-danger' : 'btn-outline-danger'"
                  (click)="toggleLike(blog)"
                  [disabled]="loading()">
                  <i class="fas fa-heart me-1"></i>
                  {{blog.likes.length}}
                </button>
              </div>
            </div>

            <!-- Blog Content -->
            <p class="card-text">{{blog.description}}</p>
            
            <!-- Blog Images -->
            <div *ngIf="blog.images.length > 0" class="mb-3">
              <img *ngFor="let image of blog.images" 
                   [src]="image" 
                   class="img-thumbnail me-2" 
                   style="max-width: 100px;">
            </div>

            <!-- Comments Section -->
            <div class="mt-3">
              <h6>Comments ({{blog.comments.length}})</h6>
              
              <!-- Existing Comments -->
              <div *ngIf="blog.comments.length > 0" class="mb-3">
                <div *ngFor="let comment of blog.comments" class="border-start border-3 border-primary ps-3 mb-2">
                  <small class="text-muted">User {{comment.user_id}} - {{formatDate(comment.created_at)}}</small>
                  <p class="mb-0">{{comment.text}}</p>
                </div>
              </div>

              <!-- Add Comment Form -->
              <div class="mt-3">
                <div class="input-group">
                  <input 
                    type="text" 
                    class="form-control" 
                    placeholder="Write a comment..." 
                    [(ngModel)]="newComments[blog.id]"
                    (keyup.enter)="handleEnterKey(blog.id, blog.author_id)">
                  <button 
                    class="btn btn-primary" 
                    type="button" 
                    (click)="addComment(blog.id, blog.author_id)"
                    [disabled]="loading() || !newComments[blog.id].trim()">
                    <i class="fas fa-comment me-1"></i>
                    Comment
                  </button>
                </div>
                
                <!-- Follow Warning -->
                <div *ngIf="!canComment(blog.author_id)" class="alert alert-warning mt-2">
                  <i class="fas fa-exclamation-triangle me-2"></i>
                  You must follow the author to comment on their blog.
                  <button 
                    class="btn btn-sm btn-primary ms-2" 
                    (click)="followUser(blog.author_id)">
                    Follow Author
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Blogs Message -->
      <div *ngIf="blogs().length === 0 && !loading()" class="card">
        <div class="card-body text-center">
          <i class="fas fa-blog fa-3x text-muted mb-3"></i>
          <h5>No blogs found</h5>
          <p class="text-muted">Click "Load Real Blogs" to fetch blogs from MongoDB.</p>
        </div>
      </div>

      <!-- Response Display -->
      <div *ngIf="response()" class="card mt-4">
        <div class="card-body">
          <h5 class="card-title">Latest API Response</h5>
          <div class="alert" [ngClass]="{
            'alert-success': !response()?.error,
            'alert-danger': response()?.error
          }">
            <pre>{{response() | json}}</pre>
          </div>
        </div>
      </div>
    </div>
  `
})
export class EnhancedBlogsComponent implements OnInit {
  loading = signal(false);
  response = signal<any>(null);
  blogs = signal<Blog[]>([]);
  followingList = signal<number[]>([]);
  newComments: { [blogId: string]: string } = {};

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadBlogs();
    this.loadFollowingList();
  }

  getCurrentUserId(): number {
    return 1; // Mock current user ID
  }

  loadBlogs(): void {
    this.loading.set(true);
    this.apiService.getBlogs().subscribe({  // Koristite getBlogs umesto getRealBlogs
        next: (data: any) => {  // Dodajte : any
        this.blogs.set(data.blogs || []);
        this.response.set(data);
        this.loading.set(false);
        
        // Inicijalizujte newComments za sve blogove
        const blogs = data.blogs || [];
        blogs.forEach((blog: any) => {
            if (!this.newComments[blog.id]) {
            this.newComments[blog.id] = '';
            }
        });
        },
        error: (error) => {
        this.response.set({ error: error.message });
        this.loading.set(false);
        }
    });
    }

  loadFollowingList(): void {
    this.apiService.getFollowing().subscribe({
      next: (data) => {
        const followingIds = (data.following || []).map((f: any) => f.following_id);
        this.followingList.set(followingIds);
      },
      error: (error) => {
        console.error('Failed to load following list:', error);
      }
    });
  }

  isFollowing(userId: number): boolean {
    return this.followingList().includes(userId);
  }

  canComment(authorId: number): boolean {
    return this.getCurrentUserId() === authorId || this.isFollowing(authorId);
  }

  hasLiked(blog: Blog): boolean {
    return blog.likes.includes(this.getCurrentUserId());
  }

  toggleFollow(userId: number): void {
    this.loading.set(true);
    
    const isCurrentlyFollowing = this.isFollowing(userId);
    const action = isCurrentlyFollowing ? 
      this.apiService.unfollowUser(userId) : 
      this.apiService.followUser(userId);

    action.subscribe({
      next: (data: any) => {  // Dodajte ': any'
        this.response.set(data);
        this.loading.set(false);
        if (data.message) {  // Samo proverite da li postoji message
            this.loadFollowingList();
        }
        },
      error: (error) => {
        this.response.set({ error: error.message });
        this.loading.set(false);
      }
    });
  }

  followUser(userId: number): void {
    this.loading.set(true);
    this.apiService.followUser(userId).subscribe({
      next: (data: any) => {  // Dodajte ': any'
        this.response.set(data);
        this.loading.set(false);
        if (data.message) {  // Samo proverite da li postoji message
            this.loadFollowingList();
        }
        },
      error: (error) => {
        this.response.set({ error: error.message });
        this.loading.set(false);
      }
    });
  }

  toggleLike(blog: Blog): void {
    this.loading.set(true);
    
    const hasLiked = this.hasLiked(blog);
    const action = hasLiked ? 
      this.apiService.unlikeBlog(blog.id) : 
      this.apiService.likeBlog(blog.id);

    action.subscribe({
      next: (data) => {
        this.response.set(data);
        this.loading.set(false);
        if (!data.error) {
          this.loadBlogs(); // Refresh blogs to update like count
        }
      },
      error: (error) => {
        this.response.set({ error: error.message });
        this.loading.set(false);
      }
    });
  }

  addComment(blogId: string, authorId: number): void {
    const commentText = (this.newComments[blogId] || '').trim(); // Dodajte || ''
    if (!commentText) return;

    // Check if user can comment
    if (!this.canComment(authorId)) {
        this.response.set({ 
        error: 'You must follow the author to comment on their blog' 
        });
        return;
    }

    this.loading.set(true);
    this.apiService.addComment(blogId, commentText).subscribe({
        next: (data: any) => { // Dodajte : any
        this.response.set(data);
        this.loading.set(false);
        if (data.message) { // Umesto !data.error
            this.newComments[blogId] = '';
            this.loadBlogs();
        }
        },
        error: (error) => {
        this.response.set({ error: error.message });
        this.loading.set(false);
        }
    });
    }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  handleEnterKey(blogId: string, authorId: number): void {
  const commentText = (this.newComments[blogId] || '').trim();
  if (commentText) {
    this.addComment(blogId, authorId);
  }
}
}