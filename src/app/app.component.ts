import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { PresenceService } from "./presence.service";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  standalone: true,
  imports: [RouterOutlet],
})
export class AppComponent implements OnInit, OnDestroy {
  private _unsubscribeAll = new Subject<void>();
  connectedUsers: string[] = [];

  private inactivityTimeout!: any;
  private readonly inactivityLimit = 60000; // 1 minuto
  private isInactive = false;

  constructor(private presenceService: PresenceService) {}

  @HostListener("window:beforeunload", ["$event"])
  unloadHandler(event: any): void {
    this.presenceService.stopConnection(); // <-- Notifica al servidor
  }

  ngOnInit(): void {
    this.startInactivityWatch();

    const token = localStorage.getItem("accessToken");
    const storedData = JSON.parse(
      localStorage.getItem("userInformation") || "{}"
    );

    if (!token || !storedData?.usuario?.id) return;

    this.presenceService.startConnection(token, storedData.usuario.id);

    this.presenceService
      .onUsuarioConectado()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((newConnectedUsers: string[]) => {
        const previousUsers = this.connectedUsers;

        const nuevos = newConnectedUsers.filter(
          (u) => !previousUsers.includes(u)
        );
        const desconectados = previousUsers.filter(
          (u) => !newConnectedUsers.includes(u)
        );

        if (nuevos.length > 0) {
          console.log("🚀 Usuarios que se conectaron:", nuevos);
        }

        if (desconectados.length > 0) {
          console.log("❌ Usuarios que se desconectaron:", desconectados);
        }

        this.connectedUsers = newConnectedUsers;
      });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  startInactivityWatch(): void {
    this.resetInactivityTimer();
  
    // Escuchar eventos que indican actividad
    window.addEventListener('mousemove', this.resetInactivityTimer.bind(this));
    window.addEventListener('keydown', this.resetInactivityTimer.bind(this));
    window.addEventListener('click', this.resetInactivityTimer.bind(this));
  }
  
  resetInactivityTimer(): void {
    clearTimeout(this.inactivityTimeout);
  
    // Si estaba inactivo, lo marcamos como activo
    if (this.isInactive) {
      this.isInactive = false;
      this.presenceService.setActive(); // 👈 Notificar al servidor
      console.log('👋 Usuario volvió a estar activo');
    }
  
    // Configurar el timeout nuevamente
    this.inactivityTimeout = setTimeout(() => {
      this.isInactive = true;
      this.presenceService.setAway(); // 👈 Notificar al servidor
      console.log('💤 Usuario marcado como inactivo');
    }, this.inactivityLimit);
  }
}
