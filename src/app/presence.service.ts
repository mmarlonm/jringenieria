// src/app/services/presence.service.ts
import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { environment } from "environments/environment";

@Injectable({ providedIn: 'root' })
export class PresenceService {
  private hubConnection: signalR.HubConnection;
  private connectedUsersSubject = new BehaviorSubject<string[]>([]);
  connectedUsers$ = this.connectedUsersSubject.asObservable();
  private apiUrlPresence = `${environment.apiUrlSignal}`;
  private apiUrl = `${environment.apiUrl}/Auth`;
  public startConnection(token: string): void {
    if (this.hubConnection) return; // Previene múltiples conexiones
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.apiUrlPresence}/presenceHub`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('SignalR conectado');
        this.startHeartbeat();
        this.requestConnectedUsers();
        this.listenToUserChanges();
      })
      .catch(err => console.error('Error conectando SignalR', err));
  }

  private startHeartbeat() {
    setInterval(() => {
      this.hubConnection.invoke('Heartbeat').catch(err => console.error(err));
    }, 30000); // cada 30 segundos
  }

  private requestConnectedUsers() {
    fetch(`${this.apiUrl}/conectados`)
      .then(res => res.json())
      .then(data => this.connectedUsersSubject.next(data));
  }

  private listenToUserChanges() {
    this.hubConnection.on('UserConnected', (userId: string) => {
      const users = this.connectedUsersSubject.value;
      if (!users.includes(userId)) {
        this.connectedUsersSubject.next([...users, userId]);
      }
    });

    this.hubConnection.on('UserDisconnected', (userId: string) => {
      const users = this.connectedUsersSubject.value.filter(id => id !== userId);
      this.connectedUsersSubject.next(users);
    });
  }

  stopConnection() {
    this.hubConnection.stop();
  }
}