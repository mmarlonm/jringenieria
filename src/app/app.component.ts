import { Component, HostListener, OnDestroy, OnInit, inject } from "@angular/core";
import { Router, NavigationEnd, RouterOutlet } from "@angular/router";
import { PresenceService } from "./presence.service";
import { Subject, takeUntil, take, filter } from "rxjs";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { BirthdayModalComponent } from "app/shared/components/birthday-modal/birthday-modal.component";
import { SignalRService } from "./signalr.service";
import { ChatNotificationService } from "./shared/components/chat-notification/chat-notification.service";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { UsersService } from "app/modules/admin/security/users/users.service";
import { SileoWrapperComponent } from "./shared/components/sileo-wrapper/sileo-wrapper.component";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  standalone: true,
  imports: [RouterOutlet, MatDialogModule, MatSnackBarModule, SileoWrapperComponent],
})
export class AppComponent implements OnInit, OnDestroy {
  private _unsubscribeAll = new Subject<void>();
  connectedUsers: string[] = [];
  private inactivityTimeout!: ReturnType<typeof setTimeout>;
  private readonly inactivityLimit = 60000;
  private isInactive = false;
  private _dialog = inject(MatDialog);
  private currentUserId: string | null = null;

  constructor(
    private presenceService: PresenceService,
    private signalRService: SignalRService,
    private chatNotificationService: ChatNotificationService,
    private _usersService: UsersService,
    private router: Router
  ) { }

  @HostListener("window:beforeunload")
  unloadHandler(): void {
    this.presenceService.stopConnection();
  }

  ngOnInit(): void {
    this.checkAndStartServices();

    // Re-verificar conexión en cada navegación (por si el usuario acaba de loguearse)
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this._unsubscribeAll)
    ).subscribe((event) => {
      const navEvent = event as NavigationEnd;
      console.log('🛣️ [AppComponent] Navegación detectada, verificando servicios...', navEvent.url);
      // Pequeño delay para asegurar que localStorage esté listo tras redirección
      setTimeout(() => this.checkAndStartServices(), 300);
    });

    this.startInactivityWatch();

    // Gatillo ultra-proactivo: Intentar conectar ya mismo y a los 2 segundos
    this.checkAndStartServices();
    setTimeout(() => this.checkAndStartServices(), 2000);

    // Watchdog de 30 segundos para asegurar que la conexión se mantenga
    setInterval(() => this.checkAndStartServices(), 30000);
  }

  private checkAndStartServices(): void {
    const token = localStorage.getItem("accessToken");
    const storedData = this.safeParse(localStorage.getItem("userInformation"));
    const userId = storedData?.usuario?.id;

    if (!token || !userId) {
      this.presenceService.stopConnection();
      return;
    }

    // Pre-cargar usuarios si no están cargados (para nombres en notificaciones)
    this._usersService.getUsers().subscribe();

    // Check for birthday
    this.checkBirthday(storedData);

    // Actualizar ID actual para el filtro de mensajes propios
    this.currentUserId = userId.toString();

    // Conectar Presence y SignalR si no están conectados
    // PresenceService ya maneja su propio bloqueo interno si ya está conectado
    this.presenceService.startConnection(token, userId);

    // SignalRService ahora maneja su propio bloqueo si ya está conectado/conectando
    this.signalRService.startConnection(userId.toString(), token);

    // Asegurar suscripción única a mensajes
    this.subscribeToMessages();

    this.presenceService
      .onUsuarioConectado()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((newConnectedUsers: string[]) => {
        this.connectedUsers = newConnectedUsers;
      });
  }

  private isSubscribedToMessages = false;
  private subscribeToMessages(): void {
    if (this.isSubscribedToMessages) return;
    this.isSubscribedToMessages = true;

    console.log('[AppComponent] 📡 Suscribiéndose a onMensajeRecibido...');
    this.signalRService.onMensajeRecibido()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((nuevoMensaje) => {
        console.log('[AppComponent] 📩 MENSAJE RECIBIDO DESDE SIGNALR:', nuevoMensaje);

        const remitenteId = nuevoMensaje.remitenteId || nuevoMensaje.contactId || nuevoMensaje.senderId || nuevoMensaje.usuarioId || nuevoMensaje.id;
        const contenido = nuevoMensaje.contenido || nuevoMensaje.value || nuevoMensaje.mensaje || nuevoMensaje.text || 'Nuevo mensaje';
        const nombreSugerido = nuevoMensaje.remitenteNombre || nuevoMensaje.senderName || nuevoMensaje.name || 'Equipo CRM';

        // Evitar notificaciones de mensajes propios usando el ID de la sesión actual
        if (remitenteId && this.currentUserId && String(remitenteId) === String(this.currentUserId)) {
          console.log('[AppComponent] Ignorando mensaje propio');
          return;
        }

        // Mostrar notificación de inmediato
        console.log('[AppComponent] 🔔 DISPARANDO NOTIFICACIÓN:', nombreSugerido, contenido);
        this.chatNotificationService.showNotification(nombreSugerido, contenido);

        // Opcional: Intentar resolver el nombre real si la lista está cargada
        this._usersService.users$.pipe(take(1)).subscribe(users => {
          if (users) {
            const user = users.find(u => (u.usuarioId || u.id) == remitenteId);
            if (user && user.nombreUsuario && user.nombreUsuario !== nombreSugerido) {
              // Aquí se podría actualizar, pero Sileo ya mostró el toast. 
              // Al menos nos servirá para futuros mensajes.
            }
          }
        });
      });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    this.presenceService.stopConnection();
    clearTimeout(this.inactivityTimeout);
    window.removeEventListener("mousemove", this.resetInactivityTimer);
    window.removeEventListener("keydown", this.resetInactivityTimer);
    window.removeEventListener("click", this.resetInactivityTimer);
  }

  startInactivityWatch(): void {
    this.resetInactivityTimer = this.resetInactivityTimer.bind(this); // ensure `this` is correct
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

  private safeParse(data: string | null): any {
    try {
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private checkBirthday(userData: any): void {
    const fechaNacimiento = userData?.usuario?.fechaNacimiento;
    const userId = userData?.usuario?.id;

    console.log('🎂 Revisando cumpleaños...', { fechaNacimiento, userId });

    if (!fechaNacimiento || !userId) return;

    // Usar un método más robusto para evitar desfases de zona horaria
    // Asumiendo formato YYYY-MM-DD o ISO
    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth() + 1; // getMonth() es 0-11

    let birthDay, birthMonth;

    if (typeof fechaNacimiento === 'string' && fechaNacimiento.includes('-')) {
      // Si es un string "XXXX-MM-DD...", extraemos directamente los números
      const parts = fechaNacimiento.split('T')[0].split('-');
      birthMonth = parseInt(parts[1], 10);
      birthDay = parseInt(parts[2], 10);
    } else {
      const birthDate = new Date(fechaNacimiento);
      birthDay = birthDate.getDate();
      birthMonth = birthDate.getMonth() + 1;
    }

    console.log('📅 Comparación:', {
      hoy: `${todayDay}/${todayMonth}`,
      cumple: `${birthDay}/${birthMonth}`
    });

    const isBirthday = birthDay === todayDay && birthMonth === todayMonth;

    if (isBirthday) {
      console.log('🎉 ¡Es tu cumpleaños! Abriendo modal...');
      const year = today.getFullYear();
      const storageKey = `birthday_celebrated_${year}_${userId}`;
      const alreadyCelebrated = localStorage.getItem(storageKey);

      if (!alreadyCelebrated) {
        this.showBirthdayCelebration();
        localStorage.setItem(storageKey, 'true');
      } else {
        console.log('🎈 Ya celebramos hoy, no mostramos de nuevo.');
      }
    } else {
      console.log('⏳ Aún no es tu cumpleaños.');
    }
  }

  private showBirthdayCelebration(): void {
    this._dialog.open(BirthdayModalComponent, {
      width: '500px',
      panelClass: 'birthday-modal-panel',
      autoFocus: false,
      disableClose: false
    });
  }
}