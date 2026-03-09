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
    try {
      const id = sileo.success({
        title: title,
        description: description,
        duration: duration
      });
    } catch (error) {
      console.error('❌ [ChatNotificationService] Error en sileo.success:', error);
    }
  }

  /**
   * Muestra una notificación de ERROR (Rojo/Premium).
   */
  showError(title: string, description: string, duration: number = 8000): void {
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
    return (sileo as any).loading({
      title: title,
      description: description
    });
  }

  /**
   * Maneja promesas automáticamente mostrando loading, success o error.
   */
  promise<T>(
    promise: Promise<T>,
    options: {
      loading: string | { title?: string; description?: string };
      success: string | { title?: string; description?: string } | ((data: T) => string | { title?: string; description?: string });
      error: string | { title?: string; description?: string } | ((error: any) => string | { title?: string; description?: string });
    }
  ): Promise<T> {
    return (sileo as any).promise(promise, options);
  }

  // Mantenemos compatibilidad con el método anterior si es necesario, 
  // pero lo redirigimos a showSuccess
  showNotification(remitenteName: string, contenido: string, title: string = 'Nuevo mensaje'): void {
    this.showSuccess(title, `${remitenteName}: ${contenido}`);
  }
}
