import { Injectable } from "@angular/core";
import * as signalR from "@microsoft/signalr";
import { Subject, Observable } from "rxjs";
import { environment } from "environments/environment"; // Asegúrate de tener la URL base de tu API aquí

@Injectable({
    providedIn: "root",
  })
  export class SignalRService {
    private hubConnection: signalR.HubConnection;
    private mensajeRecibidoSubject = new Subject<any>();
    private apiUrl = `${environment.apiUrlSignal}`;
  
    public startConnection(userId: string): void {
      if (this.hubConnection) return; // Previene múltiples conexiones
  
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${this.apiUrl}/chatHub`, {
          accessTokenFactory: () => localStorage.getItem("accessToken") || "",
        })
        .withAutomaticReconnect()
        .build();
  
      this.hubConnection
        .start()
        .then(() => {
          this.registerSignalRHandlers(); // Asegúrate de registrar después de conexión
        })
        .catch((err) => console.error("Error al conectar SignalR: ", err));
    }
  
    public unirseAlChat(chatId: number): void {
      if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
        this.hubConnection.invoke("UnirseAlChat", chatId).catch(console.error);
      }
    }
  
    public salirDelChat(chatId: number): void {
      if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
        this.hubConnection.invoke("SalirDelChat", chatId).catch(console.error);
      }
    }
  
    public onMensajeRecibido(): Observable<any> {
      return this.mensajeRecibidoSubject.asObservable();
    }
  
    private registerSignalRHandlers(): void {
      this.hubConnection.on("MensajeRecibido", (mensaje) => {
        this.mensajeRecibidoSubject.next(mensaje);
      });
    }
  
    public stopConnection(): void {
      if (this.hubConnection) {
        this.hubConnection.stop().then(() => {
          this.hubConnection = null;
        });
      }
    }
  }