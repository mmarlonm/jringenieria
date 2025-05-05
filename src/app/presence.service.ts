// src/app/services/presence.service.ts
import { Injectable } from "@angular/core";
import * as signalR from "@microsoft/signalr";
import { BehaviorSubject, Observable } from "rxjs";
import { environment } from "environments/environment";

@Injectable({ providedIn: "root" })
export class PresenceService {
  private hubConnection: signalR.HubConnection;
  private connectedUsersSubject = new BehaviorSubject<string[]>([]);
  connectedUsers$ = this.connectedUsersSubject.asObservable();
  private apiUrlPresence = `${environment.apiUrlSignal}`;
  private apiUrl = `${environment.apiUrl}/Auth`;
  private usuarioId: string;


  public startConnection(token: string, userId: string): void {
    this.usuarioId = userId;
    if (this.hubConnection) return; // Previene múltiples conexiones
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.apiUrlPresence}/presenceHub?usuarioId=${userId}`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log("SignalR conectado");
        this.startHeartbeat();
        this.requestConnectedUsers();
        this.listenToConnectedUsers();
        this.listenToUserStatus();
      })
      .catch((err) => console.error("Error conectando SignalR", err));
  }

  private startHeartbeat() {
    setInterval(() => {
      this.hubConnection.invoke("Heartbeat")
      .then((res) => {
        console.log("Heartbeat enviado", res);
      })
      .catch((err) => console.error(err));
    }, 30000); // cada 30 segundos
  }

  private requestConnectedUsers() {
    fetch(`${this.apiUrl}/conectados`)
      .then((res) => res.json())
      .then((data) => this.connectedUsersSubject.next(data));
  }

  private listenToConnectedUsers() {
    this.hubConnection.on(
      "ConnectedUsersUpdated",
      (connectedUsers: string[]) => {
        console.log("Usuarios conectados actualizados:", connectedUsers);
        this.connectedUsersSubject.next(connectedUsers);
      }
    );
  }

  public onUsuarioConectado(): Observable<any> {
    return this.connectedUsersSubject.asObservable();
  }

  private listenToUserStatus() {
    this.hubConnection.on("UserConnected", (userId: string) => {
      console.log(`✅ Usuario conectado: ${userId}`);
      // aquí puedes mostrar un toast o animación si quieres
    });

    this.hubConnection.on("UserDisconnected", (userId: string) => {
      console.log(`❌ Usuario desconectado: ${userId}`);
      // también puedes mostrar un mensaje visual
    });
  }

  setAway(): void {
    this.hubConnection.invoke('SetAway', this.usuarioId).catch(console.error);
  }
  
  setActive(): void {
    this.hubConnection.invoke('SetActive', this.usuarioId).catch(console.error);
  }

  stopConnection() {
    if (this.hubConnection) {
      this.hubConnection.stop()
        .then(() => console.log('SignalR desconectado'))
        .catch(err => console.error('Error al desconectar SignalR', err));
      this.hubConnection = undefined; // Limpiar referencia
    }
  }
}
