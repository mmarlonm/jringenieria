import { Injectable } from "@angular/core";
import * as signalR from "@microsoft/signalr";
import { BehaviorSubject, Observable } from "rxjs";
import { environment } from "environments/environment";

@Injectable({ providedIn: "root" })
export class PresenceService {
  private hubConnection: signalR.HubConnection | undefined;
  private connectedUsersSubject = new BehaviorSubject<string[]>([]);
  connectedUsers$ = this.connectedUsersSubject.asObservable();
  private apiUrlPresence = `${environment.apiUrlSignal}`;
  private apiUrl = `${environment.apiUrl}/Auth`;
  private usuarioId: string | undefined;
  private heartbeatIntervalId: any;

  public startConnection(token: string, userId: string): void {
    if (this.hubConnection) return;

    this.usuarioId = userId;
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.apiUrlPresence}/presenceHub?usuarioId=${userId}`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log("✅ SignalR conectado");
        this.startHeartbeat();
        this.requestConnectedUsers();
        this.listenToConnectedUsers();
        this.listenToUserStatus();
      })
      .catch((err) => console.error("❌ Error conectando SignalR", err));
  }

  private startHeartbeat() {
    this.stopHeartbeat(); // evitar duplicados
    this.heartbeatIntervalId = setInterval(() => {
      if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
        this.hubConnection.invoke("Heartbeat").catch((err) =>
          console.error("Error en Heartbeat", err)
        );
      }
    }, 62000);
  }

  private stopHeartbeat() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  private requestConnectedUsers() {
    fetch(`${this.apiUrl}/conectados`)
      .then((res) => res.json())
      .then((data) => this.connectedUsersSubject.next(data))
      .catch((err) => console.error("Error al obtener usuarios conectados", err));
  }

  private listenToConnectedUsers() {
    this.hubConnection?.on("ConnectedUsersUpdated", (connectedUsers: any) => {
      this.connectedUsersSubject.next(connectedUsers);
    });
  }

  private listenToUserStatus() {
    this.hubConnection?.on("UserConnected", (userId: string) => {
      console.log(`✅ Usuario conectado: ${userId}`);
    });

    this.hubConnection?.on("UserDisconnected", (userId: string) => {
      console.log(`❌ Usuario desconectado: ${userId}`);
    });
  }

  setAway(): void {
    if (this.usuarioId) {
      this.hubConnection?.invoke("SetAway", this.usuarioId.toString()).catch(console.error);
    }
  }

  setActive(): void {
    if (this.usuarioId) {
      this.hubConnection?.invoke("SetActive", this.usuarioId.toString()).catch(console.error);
    }
  }

  stopConnection() {
    this.stopHeartbeat();
    if (this.hubConnection) {
      this.hubConnection.stop()
        .then(() => console.log("🛑 SignalR desconectado"))
        .catch(err => console.error("Error al desconectar SignalR", err));
      this.hubConnection = undefined;
    }
  }

  sendHeartbeat(): void {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke("Heartbeat").catch(console.error);
    }
  }

  public onUsuarioConectado(): Observable<string[]> {
    return this.connectedUsers$;
  }
}