import { Injectable } from '@angular/core';
import { sileo } from 'sileo';

@Injectable({
  providedIn: 'root'
})
export class ChatNotificationService {

  /**
   * Muestra una notificación de chat usando Sileo (Librería React integrada vía puente).
   * @param remitenteName Nombre del remitente
   * @param contenido Contenido del mensaje
   */
  showNotification(remitenteName: string, contenido: string): void {
    // Sileo's success method expects a SileoOptions object.
    sileo.success({
      title: remitenteName || 'Nuevo mensaje',
      description: contenido
    });
  }
}
