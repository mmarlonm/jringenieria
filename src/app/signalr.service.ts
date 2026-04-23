import { Injectable } from "@angular/core";
import * as signalR from "@microsoft/signalr";
import { Observable, ReplaySubject } from "rxjs";
import { environment } from "environments/environment"; // Asegúrate de tener la URL base de tu API aquí

@Injectable({
  providedIn: "root",
})
export class SignalRService {
  private hubConnection: signalR.HubConnection | null = null;
  private mensajeRecibidoSubject = new ReplaySubject<any>(1);
  public connectionEstablished = new ReplaySubject<boolean>(1);
  private apiUrl = `${environment.apiUrlSignal}`;

  private heartbeatIntervalId: any;
  private isHandlerRegistered = false;

  public startConnection(userId: string, token?: string): void {
    // Si ya está conectada, conectando o reconectando, no hacer nada para evitar colisiones
    if (this.hubConnection && (
      this.hubConnection.state === signalR.HubConnectionState.Connected ||
      this.hubConnection.state === signalR.HubConnectionState.Connecting ||
      this.hubConnection.state === signalR.HubConnectionState.Reconnecting
    )) {
      return;
    }

    const finalToken = token || localStorage.getItem("accessToken");
    if (!finalToken) {
      // console.warn('📡 [SignalRService] Imposible conectar: Falta token');
      return;
    }

    // console.log('📡 [SignalRService] Iniciando Hub de Chat global...', { userId });

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.apiUrl}/chatHub?usuarioId=${userId}`, {
        accessTokenFactory: () => finalToken,
      })
      .withAutomaticReconnect()
      .build();

    // Resetear flag de handlers para el nuevo objeto de conexión
    this.isHandlerRegistered = false;
    this.registerSignalRHandlers();

    this.hubConnection.onreconnecting((error) => { });
    this.hubConnection.onreconnected(() => {
      console.log('✅ [SignalRService] Conexión reestablecida');
      this.connectionEstablished.next(true);
    });

    this.hubConnection
      .start()
      .then(() => {
        console.log("✅ [SignalRService] Conectado exitosamente y escuchando mensajes");
        this.connectionEstablished.next(true);
        this.startHeartbeat();
      })
      .catch((err) => {
        // console.error("❌ [SignalRService] Error crítico al iniciar conexión:", err);
        // Permitir reintentos inmediatos limpiando el estado
        this.hubConnection = null;
        this.connectionEstablished.next(false);
      });
  }

  private startHeartbeat(): void {
    if (this.heartbeatIntervalId) clearInterval(this.heartbeatIntervalId);
    this.heartbeatIntervalId = setInterval(() => {
      if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
        // Algunas implementaciones requieren Heartbeat explícito para mantener el pool activo
        this.hubConnection.invoke("Heartbeat").catch(() => { });
      }
    }, 60000);
  }

  public unirseAlChat(chatId: number): void {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke("UnirseAlChat", chatId).catch(() => { });
    }
  }

  public salirDelChat(chatId: number): void {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke("SalirDelChat", chatId).catch(() => { });
    }
  }

  public onMensajeRecibido(): Observable<any> {
    return this.mensajeRecibidoSubject.asObservable();
  }

  private registerSignalRHandlers(): void {
    if (!this.hubConnection || this.isHandlerRegistered) return;
    this.isHandlerRegistered = true;

    const handler = (mensaje: any) => {
      // console.log('📡 [SignalRService] Mensaje RAW recibido:', mensaje);
      try {
        this.mensajeRecibidoSubject.next(mensaje);
      } catch (err) {
        // console.error('❌ [SignalRService] Error emitiendo mensaje:', err);
      }
    };

    this.hubConnection.on("MensajeRecibido", handler);
    this.hubConnection.on("NuevoMensaje", handler);
    this.hubConnection.on("ReceiveMessage", handler);
  }

  public stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop().then(() => {
        this.hubConnection = null;
      });
    }
  }
}