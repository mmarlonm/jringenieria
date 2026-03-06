import { Injectable } from '@angular/core';
import { sileo } from 'sileo';

@Injectable({
  providedIn: 'root'
})
export class ChatNotificationService {

  /**
   * Muestra una notificación usando Sileo con estilo 'Dynamic Island'.
   * @param remitenteName Nombre del remitente
   * @param contenido Contenido del mensaje
   * @param title Título genérico (ej: 'Nuevo mensaje')
   */
  showNotification(remitenteName: string, contenido: string, title: string = 'Nuevo mensaje'): void {
    console.log('🚀 [ChatNotificationService] Llamando a sileo.success', { remitenteName, contenido, title });
    sileo.success({
      title: title,
      description: `${remitenteName}: ${contenido}`,
      duration: 8000
    });
  }
}
