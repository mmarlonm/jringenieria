import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { FuseNavigationItem } from '@fuse/components/navigation';

@Component({
  selector: 'app-role-navigation',
  templateUrl: './rol-navigation.component.html',
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonModule
  ]
})
export class RoleNavigationComponent {

  // Recibimos el árbol de navegación
  @Input() navigation: FuseNavigationItem[] = [];

  // Recibimos el diccionario de permisos: { 'dashboards.quote': true }
  @Input() selectedPermissions: { [id: string]: boolean } = {};

  // Emitimos los cambios al padre
  @Output() permisosSeleccionados = new EventEmitter<{ [id: string]: boolean }>();

  constructor() { }

  /**
   * ESTA ES LA FUNCIÓN QUE FALTABA Y QUE CAUSA TU ERROR
   * Se llama cada vez que tocas un checkbox en el HTML.
   */
  onPermissionChange(itemId: string, isChecked: boolean): void {
    // 1. Si el objeto es nulo/undefined, lo inicializamos
    if (!this.selectedPermissions) {
      this.selectedPermissions = {};
    }

    // 2. Guardamos el valor (true o false) directamente
    this.selectedPermissions[itemId] = isChecked;

    // 3. Emitimos una copia del objeto actualizado al padre
    this.permisosSeleccionados.emit({ ...this.selectedPermissions });
  }
}