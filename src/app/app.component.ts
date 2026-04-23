import { Component, HostListener, OnDestroy, OnInit, inject } from "@angular/core";
import { Router, NavigationEnd, RouterOutlet } from "@angular/router";
import { PresenceService } from "./presence.service";
import { Subject, takeUntil, take, filter } from "rxjs";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { SignalRService } from "./core/signalr/signalr.service";
import { ChatNotificationService } from "./shared/components/chat-notification/chat-notification.service";
import { UsersService } from "app/modules/admin/security/users/users.service";
import { SileoWrapperComponent } from "./shared/components/sileo-wrapper/sileo-wrapper.component";
import { NotificacionesChatService } from "./notificaciones-chat.service";
import { UserService } from "app/core/user/user.service";
import { User } from "app/core/user/user.types";
import { ActivitySignalRService } from "./core/signalr/activity-signalr.service";
import { CommonModule } from "@angular/common";
import { UserTrackerService } from "./core/tracker/user-tracker.service";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatDialogModule, MatSnackBarModule, SileoWrapperComponent],
})
export class AppComponent implements OnInit, OnDestroy {
  private _unsubscribeAll = new Subject<void>();
  connectedUsers: string[] = [];
  private inactivityTimeout!: ReturnType<typeof setTimeout>;
  private readonly inactivityLimit = 60000;
  private isInactive = false;
  private _dialog = inject(MatDialog);
  private currentUserId: string | null = null;
  private currentUserName: string = 'Usuario';
  private currentUserAvatar: string | null = null;
  
  // Servicios Inyectados
  private _signalRService = inject(SignalRService);
  private _userTrackerService = inject(UserTrackerService);
  private _notificacionesChatService = inject(NotificacionesChatService);
  private _usersService = inject(UsersService);
  private _activitySignalRService = inject(ActivitySignalRService);
  private _userService = inject(UserService);

  constructor(
    private presenceService: PresenceService,
    private chatNotificationService: ChatNotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.startInactivityWatch();
    
    // 1. Obtener identidad del usuario (Replicando Tareas)
    this._userService.user$
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((user: User) => {
            const stored = JSON.parse(localStorage.getItem('userInformation') || '{}');
            const u = user?.["usuario"] || stored?.usuario;
            
            if (u) {
                this.currentUserName = u.nombreUsuario || u.nombre || 'Usuario';
                this.currentUserAvatar = u.avatar || null;
                this.currentUserId = u.usuarioId || u.id;
                console.log('👤 [Identity] Usuario identificado:', this.currentUserName);
            }
        });

    // 2. Iniciar servicios core
    this.checkAndStartServices();

    // Rastrear navegación automática con Títulos reales
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this._unsubscribeAll)
    ).subscribe((event: NavigationEnd) => {
      // Pequeño delay para dejar que la página cargue y el título cambie
      setTimeout(() => {
        // 1. Intentar buscar un título real en el DOM (Fuse/Angular)
        const domTitle = document.querySelector('h1, .page-title, .title, .breadcrumb-item.active')?.textContent?.trim();
        
        // 2. Fallback al título de la pestaña o mapeo manual
        let moduleName = domTitle || document.title.split('-')[0].trim();
        
        if (moduleName === 'JR INGENIERÍA ELÉCTRICA') {
            // Si el título es el nombre de la empresa, mapeamos por URL para ser más precisos
            const url = event.urlAfterRedirects || event.url;
            if (url.includes('users')) moduleName = 'Usuarios';
            else if (url.includes('roles')) moduleName = 'Roles';
            else if (url.includes('activity-monitor')) moduleName = 'Monitor Actividad';
            else if (url.includes('tasks')) moduleName = 'Tareas';
            else if (url.includes('compras')) moduleName = 'Compras';
        }

        const urlPath = event.urlAfterRedirects || event.url;
        this._userTrackerService.registrarEvento(moduleName, 'Acceso al módulo', 'Router', urlPath);
      }, 800);
      
      setTimeout(() => this.checkAndStartServices(), 300);
    });
  }

  private checkAndStartServices(): void {
    const storedData = JSON.parse(localStorage.getItem('userInformation') || '{}');
    const token = localStorage.getItem('accessToken');
    const userId = storedData?.usuario?.usuarioId || storedData?.usuario?.id;

    if (token && userId) {
      this.currentUserId = userId;
      this.presenceService.startConnection(userId.toString(), token);
      this._signalRService.startConnection(); // Hub de Telemetría (con filtro de rol)
      this._notificacionesChatService.startConnection();
      this._activitySignalRService.startConnection(); // Hub antiguo (opcional)

      this.subscribeToPresence();
    }
  }

  private subscribeToPresence(): void {
    this.presenceService
      .onUsuarioConectado()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((newConnectedUsers: string[]) => {
        this.connectedUsers = newConnectedUsers;
      });
  }

  @HostListener('document:click', ['$event'])
  onGlobalClick(event: MouseEvent): void {
      const target = event.target as HTMLElement;
      const logElement = target.closest('[data-log], button, a, .clickable, mat-option, [role="button"]');
      
      if (logElement) {
          const logValue = logElement.getAttribute('data-log');
          const matIcon = logElement.querySelector('mat-icon')?.textContent?.trim();
          const elementText = logElement.textContent?.trim() || logElement.getAttribute('aria-label') || logElement.getAttribute('title') || '';
          
          // 🧠 Diccionario de Iconos y su significado
          const iconMap: { [key: string]: string } = {
              'visibility': 'Ver Detalles',
              'remove_red_eye': 'Ver Detalles',
              'edit': 'Editar Registro',
              'history': 'Ver Histórico',
              'delete': 'Eliminar',
              'save': 'Guardar Cambios',
              'print': 'Imprimir',
              'download': 'Descargar'
          };

          const actionFromIcon = matIcon ? iconMap[matIcon] : null;
          const keywords = ['editar', 'ver', 'preview', 'detalles', 'histórico', 'eliminar', 'aprobar', 'guardar', 'consultar', 'info'];
          
          const isAction = keywords.some(k => elementText.toLowerCase().includes(k)) || logValue || actionFromIcon;

          if (isAction) {
              const container = logElement.closest('.card, tr, mat-row, .modal-content, .mat-mdc-dialog-container, .drawer');
              let contextInfo = container?.querySelector('.id-selector, .title-selector, .name-selector, h1, h2, h3, .mat-mdc-dialog-title')?.textContent?.trim().substring(0, 50) || '';
              
              if (!contextInfo && container?.tagName === 'TR') {
                  contextInfo = container.querySelector('td')?.textContent?.trim().substring(0, 30) || '';
              }

              const actionLabel = logValue || actionFromIcon || elementText.substring(0, 40) || 'Acción';
              const fullAction = `${actionLabel}${contextInfo ? ' -> ' + contextInfo : ''}`;
              
              const pageTitle = document.title.split('-')[0].trim() || 'Sistema';
              const urlPath = this.router.url;
              
              this._userTrackerService.registrarEvento(pageTitle, fullAction, logElement.tagName, urlPath);
          }
      }
  }

  @HostListener('window:beforeunload')
  unloadHandler(): void {
    this.stopAllServices();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    this.stopAllServices();
    clearTimeout(this.inactivityTimeout);
  }

  private stopAllServices(): void {
    this.presenceService.stopConnection();
    this._notificacionesChatService.stopConnection();
    this._activitySignalRService.stopConnection();
    this._signalRService.stopConnection();
  }

  // --- Lógica de Inactividad ---
  startInactivityWatch(): void {
    this.resetInactivityTimer = this.resetInactivityTimer.bind(this);
    window.addEventListener("mousemove", this.resetInactivityTimer);
    window.addEventListener("keydown", this.resetInactivityTimer);
    window.addEventListener("click", this.resetInactivityTimer);
    this.resetInactivityTimer();
  }

  resetInactivityTimer(): void {
    clearTimeout(this.inactivityTimeout);
    if (this.isInactive) {
      this.isInactive = false;
      this.presenceService.setActive();
    }
    this.inactivityTimeout = setTimeout(() => {
      this.isInactive = true;
      this.presenceService.setAway();
    }, this.inactivityLimit);
  }
}