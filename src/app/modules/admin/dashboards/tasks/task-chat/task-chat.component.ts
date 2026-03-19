import { Component, Input, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject, Optional } from '@angular/core';
import { TaskService } from '../tasks.service';
import { TareaComentario } from '../models/tasks.model';
import { UserService } from 'app/core/user/user.service';
import { User } from 'app/core/user/user.types';
import { Subject, takeUntil, interval, startWith, switchMap } from 'rxjs';

@Component({
  selector: 'app-task-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TextFieldModule
  ],
  templateUrl: './task-chat.component.html',
  styleUrls: ['./task-chat.component.scss']
})
export class TaskChatComponent implements OnInit, AfterViewChecked, OnDestroy {
  @Input() tareaId!: number;
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  comments: TareaComentario[] = [];
  newComment: string = '';
  loading: boolean = false;
  sending: boolean = false;
  userId: number;
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _taskService: TaskService,
    private _userService: UserService,
    @Optional() @Inject(MAT_DIALOG_DATA) private _data: any
  ) {
    if (this._data && this._data.tareaId) {
      this.tareaId = this._data.tareaId;
    }
  }

  ngOnInit(): void {
    this._userService.user$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((user: User) => {
        const u = user["usuario"] || user;
        this.userId = Number(u.id);
        
        if (this.tareaId && this.userId) {
          this.loadComments();
        }
      });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  loadComments(): void {
    if (!this.userId) return;
    this.loading = true;
    this._taskService.getComments(this.tareaId, this.userId)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (comments) => {
          this.comments = comments;
          this.loading = false;
          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  sendComment(): void {
    if (!this.newComment.trim() || this.sending || !this.userId) return;

    this.sending = true;
    const msg = this.newComment.trim();
    this.newComment = '';

    this._taskService.addComment(this.tareaId, this.userId, msg)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (comment) => {
          this.comments.push(comment);
          this.sending = false;
          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: () => {
          this.sending = false;
          this.newComment = msg; // Restaurar si falla
        }
      });
  }

  private scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }
}
