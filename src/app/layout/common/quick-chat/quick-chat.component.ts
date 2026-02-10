import { ScrollStrategy, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TextFieldModule } from '@angular/cdk/text-field';
import { DOCUMENT, DatePipe, NgClass, NgTemplateOutlet } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  Inject,
  NgZone,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FuseScrollbarDirective } from '@fuse/directives/scrollbar';
import { QuickChatService } from 'app/layout/common/quick-chat/quick-chat.service';
import { Chat } from 'app/layout/common/quick-chat/quick-chat.types';
import { Subject, takeUntil } from 'rxjs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NewChatComponent } from './new/new-chat.component';
import { UsersService } from '../../../modules/admin/security/users/users.service';
import { SignalRService } from 'app/signalr.service';

@Component({
  selector: 'quick-chat',
  templateUrl: './quick-chat.component.html',
  styleUrls: ['./quick-chat.component.scss'],
  encapsulation: ViewEncapsulation.None,
  exportAs: 'quickChat',
  standalone: true,
  imports: [
    NgClass,
    MatIconModule,
    MatButtonModule,
    FuseScrollbarDirective,
    NgTemplateOutlet,
    MatFormFieldModule,
    MatInputModule,
    TextFieldModule,
    DatePipe,
  ],
})
export class QuickChatComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('messageInput') messageInput: ElementRef;
  chat: Chat;
  chats: Chat[];
  selectedChat: Chat;
  usuarioActualId: number;
  contactoSeleccionado: number;
  private _mutationObserver: MutationObserver;
  private _scrollStrategy: ScrollStrategy = this._scrollStrategyOptions.block();
  private _overlay: HTMLElement;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  private _opened: boolean = false;
  dialogRef: MatDialogRef<NewChatComponent> | null = null;

  get opened(): boolean {
    return this._opened;
  }

  set opened(value: boolean) {
    this._opened = value;
    if (!value && this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
      this.selectedChat = null;
    }
  }

  constructor(
    @Inject(DOCUMENT) private _document: Document,
    private _elementRef: ElementRef,
    private _renderer2: Renderer2,
    private _ngZone: NgZone,
    private _quickChatService: QuickChatService,
    private _scrollStrategyOptions: ScrollStrategyOptions,
    private _usersService: UsersService,
    private dialog: MatDialog,
    private signalRService: SignalRService
  ) { }

  @HostBinding('class') get classList(): any {
    return {
      'quick-chat-opened': this.opened,
    };
  }

  @HostListener('input')
  @HostListener('ngModelChange')
  private _resizeMessageInput(): void {
    this._ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.messageInput.nativeElement.style.height = 'auto';
        this.messageInput.nativeElement.style.height = `${this.messageInput.nativeElement.scrollHeight}px`;
      });
    });
  }

  ngOnInit(): void {
    const userData = JSON.parse(this._quickChatService.userInformation);
    this.usuarioActualId = userData.usuario.id;

    this._quickChatService.getChats(this.usuarioActualId).subscribe();

    this._quickChatService.chat$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((chat: Chat) => {
        this.chat = chat;
        this.selectedChat = chat;
      });

    this._quickChatService.chats$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((chats: Chat[]) => {
        this.chats = chats;
      });

    // Inicia conexión SignalR
    this.signalRService.startConnection(this.usuarioActualId.toString());

    this.signalRService.onMensajeRecibido()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((nuevoMensaje) => {
        // Asegúrate que venga remitenteId
        nuevoMensaje.isMine = Number(nuevoMensaje.contactId) === this.usuarioActualId;

        // Opcional: solo agregar si pertenece al chat activo
        this.chat.messages.push(nuevoMensaje);
      });
  }

  ngAfterViewInit(): void {
    this._mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const mutationTarget = mutation.target as HTMLElement;
        if (mutation.attributeName === 'class') {
          if (mutationTarget.classList.contains('cdk-global-scrollblock')) {
            const top = parseInt(mutationTarget.style.top, 10);
            this._renderer2.setStyle(this._elementRef.nativeElement, 'margin-top', `${Math.abs(top)}px`);
          } else {
            this._renderer2.setStyle(this._elementRef.nativeElement, 'margin-top', null);
          }
        }
      });
    });
    this._mutationObserver.observe(this._document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  ngOnDestroy(): void {
    this._mutationObserver.disconnect();
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();

    if (this.chat) {
      this.signalRService.salirDelChat(Number(this.chat.id));
    }

    // Opcional: si quieres cerrar la conexión globalmente
    // this.signalRService.stopConnection();
  }

  open(): void {
    if (this.opened) return;
    this._toggleOpened(true);
  }

  close(): void {
    if (!this.opened) return;
    this._toggleOpened(false);
  }

  toggle(): void {
    if (this.opened) {
      this.close();
    } else {
      this.open();
      this.selectedChat = null;
    }
  }

  selectChat(id: number, idContact): void {
    this._toggleOpened(true);
    this.contactoSeleccionado = idContact;
    this.signalRService.unirseAlChat(id);
    this._quickChatService.getChatById1(id, this.usuarioActualId).subscribe(() => {
    });

  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  private _showOverlay(): void {
    this._hideOverlay();
    this._overlay = this._renderer2.createElement('div');
    if (!this._overlay) return;
    this._overlay.classList.add('quick-chat-overlay');
    this._renderer2.appendChild(this._elementRef.nativeElement.parentElement, this._overlay);
    this._scrollStrategy.enable();
    this._overlay.addEventListener('click', () => this.close());
  }

  private _hideOverlay(): void {
    if (!this._overlay) return;
    this._overlay.parentNode.removeChild(this._overlay);
    this._overlay = null;
    this._scrollStrategy.disable();
  }

  private _toggleOpened(open: boolean): void {
    this.opened = open;
    open ? this._showOverlay() : this._hideOverlay();
  }

  abrirNuevoChat(): void {
    this._usersService.getUsers().subscribe((users) => {
      const usrs = users.filter((user) => user.activo);
      const dialogRef = this.dialog.open(NewChatComponent, {
        width: '400px',
        data: { usrs },
      });

      dialogRef.afterClosed().subscribe((resultado) => {
        if (resultado) {
          const remitenteId = this.usuarioActualId;
          this._quickChatService.enviarMensaje({
            remitenteId: remitenteId,
            destinatarioId: resultado.destinatarioId,
            contenido: resultado.contenido,
          }).subscribe(() => {
            this._quickChatService.getChats(remitenteId).subscribe();
          });
        }
        this.selectedChat = null;
      });
    });
  }

  enviarMensajeDesdeTextarea(): void {
    const contenido = this.messageInput?.nativeElement?.value?.trim();
    if (!contenido || !this.usuarioActualId || !this.chat?.id) return;

    const dto = {
      remitenteId: this.usuarioActualId,
      destinatarioId: this.contactoSeleccionado,
      contenido: contenido,
    };

    this._quickChatService.enviarMensaje(dto).subscribe(() => {
      this.messageInput.nativeElement.value = '';
      this._resizeMessageInput();
    });
  }
}