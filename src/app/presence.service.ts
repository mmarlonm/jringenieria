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

  private isUserActive = true;

  public startConnection(userId: string, token: string): void {
    if (this.hubConnection) return;

    this.usuarioId = userId;
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.apiUrlPresence}/presenceHub?usuarioId=${userId}`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.None)
      .build();

    this.hubConnection
      .start()
      .then(() => {
        // console.log("✅ SignalR conectado");
        this.startHeartbeat();
        this.requestConnectedUsers();
        this.listenToConnectedUsers();
        this.listenToUserStatus();
      })
      .catch((err) => { });
  }

  private startHeartbeat() {
    this.stopHeartbeat(); // evitar duplicados
    this.heartbeatIntervalId = setInterval(() => {
      if (
        this.hubConnection?.state === signalR.HubConnectionState.Connected &&
        this.isUserActive
      ) {
        this.hubConnection.invoke("Heartbeat").catch((err) => { });
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
      .catch((err) => { });
  }

  private listenToConnectedUsers() {
    this.hubConnection?.on("ConnectedUsersUpdated", (connectedUsers: any) => {
      this.connectedUsersSubject.next(connectedUsers);
    });
  }

  private listenToUserStatus() {
    this.hubConnection?.on("UserConnected", (userId: string) => {
      const cleanId = this.extractId(userId);
      console.log(`✅ Usuario conectado: ID ${cleanId} a las ${new Date().toLocaleTimeString()}`);
    });

    this.hubConnection?.on("UserDisconnected", (userId: string) => {
      const cleanId = this.extractId(userId);
      console.log(`❌ Usuario desconectado: ID ${cleanId} a las ${new Date().toLocaleTimeString()}`);
    });
  }

  setAway(): void {
    if (this.usuarioId) {
      this.isUserActive = false;
      this.hubConnection?.invoke("SetAway", this.usuarioId.toString()).catch(() => { });
    }
  }
  
  setActive(): void {
    if (this.usuarioId) {
      this.isUserActive = true;
      this.hubConnection?.invoke("SetActive", this.usuarioId.toString()).catch(() => { });
    }
  }

  stopConnection() {
    this.stopHeartbeat();
    if (this.hubConnection) {
      this.hubConnection.stop()
        .then(() => { })
        .catch(err => { });
      this.hubConnection = undefined;
    }
  }

  sendHeartbeat(): void {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke("Heartbeat").catch(() => { });
    }
  }

  public onUsuarioConectado(): Observable<string[]> {
    return this.connectedUsers$;
  }
  private extractId(userId: string): string {
    if (!userId || !userId.startsWith("eyJ") || !userId.includes(".")) return userId;
    try {
      const payload = userId.split(".")[1];
      const decoded = JSON.parse(atob(payload));
      return decoded.sub || decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || userId;
    } catch (e) {
      return userId;
    }
  }
}