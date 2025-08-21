import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

@Component({
  selector: 'app-follow',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <h2 class="text-white mb-4">
        <i class="fas fa-users me-2"></i>Follow Management
      </h2>
      
      <!-- Follow User Section -->
      <div class="card mb-4">
        <div class="card-body">
          <h5 class="card-title">Follow User</h5>
          <div class="input-group mb-3">
            <input 
              type="number" 
              class="form-control" 
              placeholder="Enter User ID to follow" 
              [(ngModel)]="userIdToFollow"
              min="1">
            <button 
              class="btn btn-primary" 
              type="button" 
              (click)="followUser()"
              [disabled]="loading() || !userIdToFollow">
              <i class="fas fa-user-plus me-1"></i>
              {{loading() ? 'Following...' : 'Follow'}}
            </button>
          </div>
        </div>
      </div>

      <!-- Check Following Status -->
      <div class="card mb-4">
        <div class="card-body">
          <h5 class="card-title">Check Following Status</h5>
          <div class="input-group mb-3">
            <input 
              type="number" 
              class="form-control" 
              placeholder="Enter User ID to check" 
              [(ngModel)]="userIdToCheck"
              min="1">
            <button 
              class="btn btn-info" 
              type="button" 
              (click)="checkFollowing()"
              [disabled]="loading() || !userIdToCheck">
              <i class="fas fa-search me-1"></i>
              Check Status
            </button>
          </div>
          
          <div *ngIf="followStatus()" class="alert" [ngClass]="{
            'alert-success': followStatus()?.is_following,
            'alert-warning': !followStatus()?.is_following
          }">
            <strong>Status:</strong> 
            {{followStatus()?.is_following ? 'Following' : 'Not Following'}} 
            user {{followStatus()?.target_user_id}}
          </div>
        </div>
      </div>

      <!-- Following List -->
      <div class="card mb-4">
        <div class="card-body">
          <h5 class="card-title">Users I Follow</h5>
          <button 
            class="btn btn-success mb-3" 
            (click)="loadFollowing()"
            [disabled]="loading()">
            <i class="fas fa-sync-alt me-1"></i>
            {{loading() ? 'Loading...' : 'Load Following'}}
          </button>
          
          <div *ngIf="following().length > 0" class="table-responsive">
            <table class="table table-striped">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Username</th>
                  <th>Name</th>
                  <th>Following Since</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let user of following()">
                  <td>{{user.following_id}}</td>
                  <td>{{user.username}}</td>
                  <td>{{user.first_name}} {{user.last_name}}</td>
                  <td>{{formatDate(user.created_at)}}</td>
                  <td>
                    <button 
                      class="btn btn-sm btn-danger" 
                      (click)="unfollowUser(user.following_id)"
                      [disabled]="loading()">
                      <i class="fas fa-user-minus me-1"></i>
                      Unfollow
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div *ngIf="following().length === 0 && !loading()" class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>
            You are not following anyone yet.
          </div>
        </div>
      </div>

      <!-- Followers List -->
      <div class="card mb-4">
        <div class="card-body">
          <h5 class="card-title">My Followers</h5>
          <button 
            class="btn btn-success mb-3" 
            (click)="loadFollowers()"
            [disabled]="loading()">
            <i class="fas fa-sync-alt me-1"></i>
            {{loading() ? 'Loading...' : 'Load Followers'}}
          </button>
          
          <div *ngIf="followers().length > 0" class="table-responsive">
            <table class="table table-striped">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Username</th>
                  <th>Name</th>
                  <th>Following Since</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let user of followers()">
                  <td>{{user.follower_id}}</td>
                  <td>{{user.username}}</td>
                  <td>{{user.first_name}} {{user.last_name}}</td>
                  <td>{{formatDate(user.created_at)}}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div *ngIf="followers().length === 0 && !loading()" class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>
            You have no followers yet.
          </div>
        </div>
      </div>

      <!-- Response Display -->
      <div *ngIf="response()" class="card">
        <div class="card-body">
          <h5 class="card-title">API Response</h5>
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
export class FollowComponent implements OnInit {
  loading = signal(false);
  response = signal<any>(null);
  followStatus = signal<any>(null);
  following = signal<any[]>([]);
  followers = signal<any[]>([]);
  
  userIdToFollow: number | null = null;
  userIdToCheck: number | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadFollowing();
    this.loadFollowers();
  }

  followUser(): void {
    if (!this.userIdToFollow) return;
    
    this.loading.set(true);
    this.apiService.followUser(this.userIdToFollow).subscribe({
        next: (data: any) => {  // Dodajte ': any'
            this.response.set(data);
            this.loading.set(false);
            if (data.message) {  // Samo proverite da li postoji message
                this.loadFollowing();
            }
            },
        error: (error) => {
        this.response.set({ error: error.message });
        this.loading.set(false);
        }
    });
    }

  unfollowUser(userId: number): void {
  this.loading.set(true);
  this.apiService.unfollowUser(userId).subscribe({
    next: (data: any) => {  // Dodajte ': any'
        this.response.set(data);
        this.loading.set(false);
        if (data.message) {  // Samo proverite da li postoji message
            this.loadFollowing();
        }
        },
    error: (error) => {
      this.response.set({ error: error.message });
      this.loading.set(false);
    }
  });
}

  checkFollowing(): void {
    if (!this.userIdToCheck) return;
    
    this.loading.set(true);
    this.apiService.checkFollowing(this.userIdToCheck).subscribe({
      next: (data) => {
        this.followStatus.set(data);
        this.response.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        this.response.set({ error: error.message });
        this.loading.set(false);
      }
    });
  }

  loadFollowing(): void {
    this.loading.set(true);
    this.apiService.getFollowing().subscribe({
      next: (data) => {
        this.following.set(data.following || []);
        this.loading.set(false);
      },
      error: (error) => {
        this.response.set({ error: error.message });
        this.loading.set(false);
      }
    });
  }

  loadFollowers(): void {
    this.loading.set(true);
    this.apiService.getFollowers().subscribe({
      next: (data) => {
        this.followers.set(data.followers || []);
        this.loading.set(false);
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
}