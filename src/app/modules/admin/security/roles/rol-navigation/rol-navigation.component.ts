import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { FuseNavigationItem } from '@fuse/components/navigation';
import { RolService } from 'app/modules/admin/security/roles/roles.service'; // 👈 IMPORTANTE RESTAURAR ESTO

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
export class RoleNavigationComponent implements OnInit {

  @Input() navigation: FuseNavigationItem[] = [];

  // 🔹 1. RESTAURADO: Volvemos al formato de arreglos numéricos { 'dashboards': [1, 2, 3, 4] }
  @Input() selectedPermissions: { [id: string]: number[] } = {};

  // 🔹 2. RESTAURADO: El emisor vuelve a enviar un arreglo para no romper al componente padre
  @Output() permisosSeleccionados = new EventEmitter<any[]>();

  // 🔹 3. RESTAURADO: La variable que guarda los catálogos (Agregar, Editar, etc.)
  permisos: any[] = [];

  constructor(
    private rolService: RolService,
    private _changeDetectorRef: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.obtenerPermisos();
  }

  obtenerPermisos(): void {
    this.rolService.getPermisos().subscribe({
      next: (data: any) => {
        // Aseguramos que sea un arreglo sin importar la envoltura del backend
        const rawPermisos = Array.isArray(data) ? data : (data.data || data.result || []);

        // 🔹 CORRECCIÓN: Asegurar que permisoId sea numérico para comparaciones consistentes
        this.permisos = rawPermisos.map(p => ({
          ...p,
          permisoId: Number(p.permisoId || p.idPermiso || p.id)
        }));

        console.log(this.permisos);
        this.initializePermissions();
        this._changeDetectorRef.detectChanges();
      },
      error: (err) => console.error("Error al cargar permisos", err)
    });
  }

  /**
   * Inicializa los permisos con valores predeterminados (desmarcados)
   */
  /**
   * Inicializa el diccionario de permisos recorriendo el árbol de navegación de forma recursiva.
   * Si una vista no tiene permisos asignados previamente, se le asigna un arreglo vacío.
   */
  initializePermissions(): void {
    if (!this.navigation || this.navigation.length === 0) return;

    // Función recursiva interna para recorrer cualquier nivel de profundidad
    const recorrerNodos = (nodos: any[]) => {
      if (!nodos) return;

      nodos.forEach(nodo => {
        // 1. Si el nodo tiene un ID (es una vista/pantalla) y no existe en el diccionario
        if (nodo.id && !this.selectedPermissions[nodo.id]) {
          this.selectedPermissions[nodo.id] = []; // Inicializamos el array vacío
        }

        // 2. Si el nodo tiene hijos (es un grupo o carpeta colapsable), entra recursivamente
        if (nodo.children && nodo.children.length > 0) {
          recorrerNodos(nodo.children);
        }
      });
    };

    // Iniciamos el recorrido desde la raíz del menú
    console.log(this.navigation);
    recorrerNodos(this.navigation);
    console.log(this.selectedPermissions);

    this._changeDetectorRef.detectChanges();
  }

  /**
   * Checkbox Principal de la Vista (Marca o desmarca todos los sub-permisos)
   */
  onPermissionChange(itemId: string, isChecked: boolean): void {
    if (!this.selectedPermissions) this.selectedPermissions = {};

    if (isChecked) {
      // Si marca la vista, le asignamos TODOS los permisos disponibles
      this.selectedPermissions[itemId] = this.permisos.map(p => Number(p.permisoId || p.idPermiso || p.id));
    } else {
      // Si la desmarca, vaciamos el arreglo
      this.selectedPermissions[itemId] = [];
    }

    this.emitirPermisos();
  }

  /**
   * Checkbox Individual (Agregar, Editar, Eliminar, Ver)
   */
  togglePermission(vistaId: string, permisoId: number | string): void {
    const pId = Number(permisoId);
    if (!this.selectedPermissions[vistaId]) {
      this.selectedPermissions[vistaId] = [];
    }

    // Aseguramos que la lista actual sean números
    const permisosVista = this.selectedPermissions[vistaId].map(id => Number(id));

    if (permisosVista.includes(pId)) {
      // Quitar permiso
      this.selectedPermissions[vistaId] = permisosVista.filter(id => id !== pId);
    } else {
      // Agregar permiso
      permisosVista.push(pId);
      this.selectedPermissions[vistaId] = permisosVista;
    }

    this.emitirPermisos();
  }

  /**
   * Formatea los datos y los envía al componente padre
   */
  emitirPermisos(): void {
    const payload = Object.keys(this.selectedPermissions)
      .filter(key => this.selectedPermissions[key] && this.selectedPermissions[key].length > 0)
      .map(key => ({
        vistaId: key,
        permisos: this.selectedPermissions[key]
      }));

    this.permisosSeleccionados.emit(payload);
  }
}