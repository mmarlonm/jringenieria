import { Injectable } from '@angular/core';
import { sileo } from 'sileo';

@Injectable({
  providedIn: 'root'
})
export class ChatNotificationService {

  /**
   * Muestra una notificación de ÉXITO (Verde/Premium).
   */
  showSuccess(title: string, description: string, duration: number = 5000): void {
    console.log('🚀 [ChatNotificationService] Llamando a sileo.success:', { title, description });
    try {
      const id = sileo.success({
        title: title,
        description: description,
        duration: duration
      });
      console.log('✅ [ChatNotificationService] Sileo ID generado:', id);
    } catch (error) {
      console.error('❌ [ChatNotificationService] Error en sileo.success:', error);
    }
  }

  /**
   * Muestra una notificación de ERROR (Rojo/Premium).
   */
  showError(title: string, description: string, duration: number = 8000): void {
    console.log('❌ [Sileo] Error:', { title, description });
    sileo.error({
      title: title,
      description: description,
      duration: duration
    });
  }

  /**
   * Muestra una notificación de INFORMACIÓN (Azul/Premium).
   */
  showInfo(title: string, description: string, duration: number = 5000): void {
    console.log('ℹ️ [Sileo] Info:', { title, description });
    sileo.info({
      title: title,
      description: description,
      duration: duration
    });
  }

  /**
   * Muestra una notificación de ADVERTENCIA (Naranja/Premium).
   */
  showWarning(title: string, description: string, duration: number = 6000): void {
    console.log('⚠️ [Sileo] Warning:', { title, description });
    sileo.warning({
      title: title,
      description: description,
      duration: duration
    });
  }

  /**
   * Muestra una notificación de CARGA (Gooey Spinner).
   * Útil para procesos asíncronos.
   */
  showLoading(title: string, description: string): any {
    console.log('⏳ [Sileo] Loading:', { title, description });
    return (sileo as any).loading({
      title: title,
      description: description
    });
  }

  // Mantenemos compatibilidad con el método anterior si es necesario, 
  // pero lo redirigimos a showSuccess
  showNotification(remitenteName: string, contenido: string, title: string = 'Nuevo mensaje'): void {
    this.showSuccess(title, `${remitenteName}: ${contenido}`);
  }
}
