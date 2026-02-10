import { Component, Input, OnInit, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { FuseNavigationItem } from '@fuse/components/navigation';
import { RolService } from 'app/modules/admin/security/roles/roles.service';  // Asegúrate de importar el servicio

@Component({
  selector: 'app-role-navigation',
  templateUrl: './rol-navigation.component.html',
  styleUrls: ['./rol-navigation.component.scss']
})
export class RoleNavigationComponent implements OnInit {
  @Input() navigation: FuseNavigationItem[] = [];  // Recibe las vistas
  @Input() selectedPermissions: { [key: string]: number[] } = {};  // Permisos asignados previamente

  @Output() permisosSeleccionados = new EventEmitter<any[]>();  // Emitir permisos al padre

  permisos: any[] = [];  // Permisos obtenidos del endpoint

  constructor(private rolService: RolService, private _changeDetectorRef: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.obtenerPermisos(); // Obtener permisos al inicializar el componente
  }

  /**
   * Obtener los permisos desde el endpoint
   */
  obtenerPermisos(): void {
    this.rolService.getPermisos().subscribe(data => {
      this.permisos = data;  // Guardar los permisos obtenidos
      this.initializePermissions();  // Inicializar permisos en base a la respuesta
      this._changeDetectorRef.detectChanges();
    });
  }

  /**
   * Inicializa los permisos con valores predeterminados (desmarcados)
   */
  initializePermissions(): void {
    this.navigation.forEach(group => {
      group.children.forEach(item => {
        if (!this.selectedPermissions[item.id]) {
          this.selectedPermissions[item.id] = [];  // Asegúrate de que cada vista tenga un array vacío de permisos
        }
      });
    });

    this._changeDetectorRef.detectChanges();
  }

  /**
   * Maneja el cambio en un checkbox de un permiso de una vista
   */
  togglePermission(vistaId: string, permisoId: number): void {
    const permisosSeleccionados = this.selectedPermissions[vistaId];

    // Si el permiso ya está seleccionado, lo desmarcamos
    if (permisosSeleccionados.includes(permisoId)) {
      this.selectedPermissions[vistaId] = permisosSeleccionados.filter(id => id !== permisoId);
    } else {
      // Si el permiso no está seleccionado, lo marcamos
      permisosSeleccionados.push(permisoId);
    }

    this.emitirPermisos(); // Emitir los cambios al componente padre
  }

  /**
   * Verifica si todos los permisos de una vista están seleccionados
   */
  isGroupFullySelected(group: FuseNavigationItem): boolean {
    return group.children?.every(item => this.selectedPermissions[item.id]?.length > 0) ?? false;
  }

  /**
   * Maneja el cambio de selección de todo un grupo de vistas
   */
  toggleGroup(group: FuseNavigationItem): void {
    const newState = !this.isGroupFullySelected(group);
    group.children.forEach(item => {
      // Asigna todos los permisos del grupo si es seleccionado, si no los deselecciona
      this.selectedPermissions[item.id] = newState ? this.permisos.map(perm => perm.permisoId) : [];
    });
    this.emitirPermisos(); // Emitir los cambios al componente padre
  }

  /**
   * Obtiene las vistas permitidas y sus permisos seleccionados
   * Solo retorna las vistas con permisos seleccionados
   */
  getSelectedViews(): any[] {
    return this.navigation.flatMap(group =>
      group.children
        .map(vista => {
          const permisosVista = this.selectedPermissions[vista.id] || [];

          // Si la vista tiene permisos seleccionados, la agregamos
          return permisosVista.length > 0 ? { vistaId: vista.id, permisos: permisosVista } : null;
        })
        .filter(view => view !== null) // Filtrar las vistas sin permisos seleccionados
    );
  }

  /**
   * Emitir los permisos seleccionados al componente padre
   */
  emitirPermisos(): void {
    const permisosSeleccionados = this.getSelectedViews();
    this.permisosSeleccionados.emit(permisosSeleccionados); // Emitir los permisos seleccionados al componente padre
  }
}