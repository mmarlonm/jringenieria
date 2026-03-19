import { Component, Input, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject, Optional } from '@angular/core';
import { TaskService } from '../tasks.service';
import { TareaComentario } from '../models/tasks.model';
import { UserService } from 'app/core/user/user.service';
import { User } from 'app/core/user/user.types';
import { Subject, takeUntil } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from 'environments/environment';

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
    MatMenuModule,
    MatTabsModule,
    MatTooltipModule,
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
  isDragging: boolean = false; // Flag para UI feedback
  giphyResults: any[] = [];
  giphyQuery: string = '';
  customStickers: string[] = [];
  userId: number;
  private _hubConnection: signalR.HubConnection | null = null;
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  // Emoji y Sticker Lists
  emojis: string[] = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '👑', '👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁', '👅', '👄', '💋', '🩸'];

  stickers: any[] = [
    { icon: 'heroicons_outline:star', label: 'Estrella' },
    { icon: 'heroicons_outline:heart', label: 'Corazón' },
    { icon: 'heroicons_outline:light-bulb', label: 'Idea' },
    { icon: 'heroicons_outline:fire', label: 'Fuego' },
    { icon: 'heroicons_outline:sparkles', label: 'Brillos' },
    { icon: 'heroicons_outline:rocket', label: 'Cohete' },
    { icon: 'heroicons_outline:trophy', label: 'Trofeo' },
    { icon: 'heroicons_outline:cake', label: 'Pastel' },
    { icon: 'heroicons_outline:gift', label: 'Regalo' },
    { icon: 'heroicons_outline:face-smile', label: 'Sonrisa' }
  ];

  constructor(
    private _taskService: TaskService,
    private _userService: UserService,
    private _ngZone: NgZone,
    private _changeDetectorRef: ChangeDetectorRef,
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
          this.loadCustomStickers();
          this._startSignalR();
        }
      });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    if (this._hubConnection) {
      this._hubConnection.invoke('SalirDeGrupo', 'Tarea_' + this.tareaId)
        .catch(err => console.error('[TaskChat] Error SalirDeGrupo:', err));
      this._hubConnection.stop();
    }
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
          // Evitar duplicados si SignalR se adelantó
          const existe = this.comments.some(c => c.idComentario === comment.idComentario);
          if (!existe) {
            this.comments.push(comment);
          }
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
    } catch (err) { }
  }

  addEmoji(emoji: string): void {
    this.newComment += emoji;
  }

  sendSticker(sticker: any): void {
    if (this.sending) return;
    this.newComment = `[Sticker: ${sticker.icon}]`;
    this.sendComment();
  }

  onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    const text = event.clipboardData?.getData('text');

    // Si hay una URL de imagen en el texto pegado, detectarla
    if (text && (text.match(/\.(jpeg|jpg|gif|png|webp)/i) || text.startsWith('http'))) {
      if (text.startsWith('http')) {
        this.newComment = text;
        this.sendComment();
        event.preventDefault(); // Evitar que pegue el texto en el textarea
        return;
      }
    }

    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          this._convertFileToBase64(file);
        }
      }
    }
  }

  onStickerFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this._convertFileToBase64(file);
    }
  }

  private _convertFileToBase64(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const base64 = e.target.result;

      // Guardar en stickers locales si no existe
      if (!this.customStickers.includes(base64)) {
        this.customStickers.unshift(base64);
        this.saveCustomStickers();
      }

      this.newComment = `[Image]${base64}`;
      this.sendComment();
    };
    reader.readAsDataURL(file);
  }

  loadCustomStickers(): void {
    const saved = localStorage.getItem('chat_custom_stickers');
    if (saved) {
      this.customStickers = JSON.parse(saved);
    }
  }

  saveCustomStickers(): void {
    // Limitar a los últimos 20 para no saturar localStorage
    const toSave = this.customStickers.slice(0, 20);
    localStorage.setItem('chat_custom_stickers', JSON.stringify(toSave));
    this.customStickers = toSave;
  }

  deleteCustomSticker(event: Event, index: number): void {
    event.stopPropagation();
    this.customStickers.splice(index, 1);
    this.saveCustomStickers();
  }

  sendCustomSticker(base64: string): void {
    this.newComment = `[Image]${base64}`;
    this.sendComment();
  }

  isImageMessage(mensaje: string): boolean {
    if (!mensaje) return false;
    return mensaje.startsWith('[Image]data:image/') ||
      mensaje.startsWith('data:image/') ||
      mensaje.startsWith('http') && (mensaje.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) !== null);
  }

  getImageUrl(mensaje: string): string {
    if (mensaje?.startsWith('[Image]')) {
      return mensaje.substring(7);
    }
    return mensaje;
  }

  // Drag and Drop
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      if (files[0].type.startsWith('image/')) {
        this._convertFileToBase64(files[0]);
      }
    } else {
      // Intentar obtener URL de la imagen arrastrada
      const url = event.dataTransfer?.getData('text/plain');
      if (url && (url.startsWith('http') || url.match(/\.(jpeg|jpg|gif|png|webp)/i))) {
        this.newComment = url;
        this.sendComment();
      }
    }
  }

  // Giphy Integration
  searchGiphy(): void {
    if (!this.giphyQuery || this.giphyQuery.length < 3) {
      this.giphyResults = [];
      return;
    }

    const apiKey = 'pHD5Fbd8JY7OGK7mH8Bv72Cyi0il5Ri4'; // Public beta key
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(this.giphyQuery)}&limit=15`;

    fetch(url)
      .then(res => res.json())
      .then(res => {
        this.giphyResults = res.data;
      })
      .catch(err => console.error('Error searching Giphy:', err));
  }

  sendGif(gif: any): void {
    const gifUrl = gif.images.fixed_height.url;
    this.newComment = gifUrl;
    this.sendComment();
  }

  private _startSignalR(): void {
    // Si ya existe una conexión, no crear otra
    if (this._hubConnection) return;

    const url = `${environment.apiUrlSignal}/chatHub?usuarioId=${this.userId}`;
    console.log('📡 [TaskChat] Intentando conectar a:', url);

    this._hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => localStorage.getItem('accessToken') || ''
      })
      .withAutomaticReconnect()
      .build();

    this._hubConnection.start()
      .then(() => {
        console.log('📡 [TaskChat] Conectado exitosamente al Hub de Tarea:', this.tareaId);

        // Unirse al grupo de la tarea específica
        this._hubConnection?.invoke('UnirseAGrupo', 'Tarea_' + this.tareaId)
          .then(() => console.log(`✅ [TaskChat] Unido al grupo Tarea_${this.tareaId}`))
          .catch(err => console.error('[TaskChat] ❌ Error UnirseAGrupo:', err));

        // Manejador común para diferentes nombres de eventos de mensaje
        const messageHandler = (mensaje: any) => {
          console.log('📬 [TaskChat] Evento de mensaje recibido:', mensaje);
          this._ngZone.run(() => {
            if (!mensaje) return;

            // Deduplicación por ID de comentario
            const existe = this.comments.some(c => c.idComentario === mensaje.idComentario);
            if (!existe) {
              const nuevoComentario: TareaComentario = {
                ...mensaje,
                fechaCreacion: mensaje.fechaCreacion || mensaje.fecha || new Date().toISOString(),
                esMio: mensaje.idUsuario === this.userId
              };
              this.comments.push(nuevoComentario);
              this._changeDetectorRef.markForCheck();
              setTimeout(() => this.scrollToBottom(), 100);
            }
          });
        };

        // Registrar múltiples nombres de eventos por si el backend varía
        this._hubConnection?.on('MensajeRecibido', messageHandler);
        this._hubConnection?.on('NuevoMensaje', messageHandler);
        this._hubConnection?.on('ReceiveMessage', messageHandler);
      })
      .catch(err => console.error('❌ [TaskChat] Error al conectar SignalR:', err));
  }
}
