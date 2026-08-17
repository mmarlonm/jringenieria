import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation, ChangeDetectorRef, SimpleChanges, OnChanges, ChangeDetectionStrategy } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonModule
  ]
})
export class RoleNavigationComponent implements OnInit, OnChanges {

  @Input() navigation: FuseNavigationItem[] = [];

  // 🔹 1. RESTAURADO: Volvemos al formato de arreglos numéricos { 'dashboards': [1, 2, 3, 4] }
  @Input() selectedPermissions: { [id: string]: number[] } = {};

  // 🔹 2. RESTAURADO: El emisor vuelve a enviar un arreglo para no romper al componente padre
  @Output() permisosSeleccionados = new EventEmitter<any[]>();
  @Output() permisosLoadError = new EventEmitter<string>();

  // 🔹 3. RESTAURADO: La variable que guarda los catálogos (Agregar, Editar, etc.)
  permisos: any[] = [];
  loadError: string | null = null;

  constructor(
    private rolService: RolService,
    private _changeDetectorRef: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    console.log("[RoleNavigation] ngOnInit - navigation:", this.navigation);
    this.obtenerPermisos();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['navigation'] && !changes['navigation'].firstChange) {
      console.log("[RoleNavigation] Navigation input cambió:", changes['navigation'].currentValue);
      this._changeDetectorRef.markForCheck();
    }
  }

  obtenerPermisos(): void {
    this.loadError = null;
    console.log("[RoleNavigation] Iniciando carga de permisos...");

    this.rolService.getPermisos().subscribe({
      next: (data: any) => {
        console.log("[RoleNavigation] Permisos recibidos:", data);
        const rawPermisos = Array.isArray(data) ? data : (data.data || data.result || []);

        console.log("[RoleNavigation] Permisos procesados:", rawPermisos);

        if (!rawPermisos || rawPermisos.length === 0) {
          console.warn("[RoleNavigation] ⚠️ No hay permisos en la BD. Intentando inicializar...");
          this.inicializarPermisosEnServidor();
          return;
        }

        this.procesarPermisos(rawPermisos);
      },
      error: (err) => {
        console.error("[RoleNavigation] Error al cargar permisos:", err);
        console.error("[RoleNavigation] Status:", err.status);
        console.error("[RoleNavigation] Mensaje:", err.message);

        this.loadError = `Error al cargar permisos: ${err.status || 'Error de conexión'}. ${err.message || 'Intenta recargar la página.'}`;
        this.permisos = [];
        this.permisosLoadError.emit(this.loadError);
        this._changeDetectorRef.detectChanges();
      }
    });
  }

  private inicializarPermisosEnServidor(): void {
    console.log("[RoleNavigation] 🔄 Llamando endpoint de inicialización...");
    this.rolService.inicializarPermisos().subscribe({
      next: (response: any) => {
        console.log("[RoleNavigation] ✅ Permisos inicializados exitosamente:", response);
        if (response.permisos && Array.isArray(response.permisos)) {
          this.procesarPermisos(response.permisos);
        } else {
          this.obtenerPermisos(); // Reintentar la carga normal
        }
      },
      error: (err) => {
        console.error("[RoleNavigation] ❌ Error al inicializar permisos:", err);
        this.loadError = "La tabla de permisos está vacía y no se pudo inicializar automáticamente. Contacta al administrador.";
        this.permisos = [];
        this.permisosLoadError.emit(this.loadError);
        this._changeDetectorRef.detectChanges();
      }
    });
  }

  private procesarPermisos(rawPermisos: any[]): void {
    this.permisos = rawPermisos.map((p: any) => {
      const permisoId = Number(p.permisoId || p.PermisoId || p.idPermiso || p.id);
      const descripcion = p.descripcionPermiso || p.DescripcionPermiso || '';

      return {
        ...p,
        permisoId,
        descripcionPermiso: descripcion
      };
    });

    console.log("[RoleNavigation] ✅ Permisos mapeados:", this.permisos);
    console.log("[RoleNavigation] Navigation disponible:", this.navigation);
    this.loadError = null;
    this.initializePermissions();
    this._changeDetectorRef.markForCheck();
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

  isPermisoVisibleForNode(nodeId: string, permiso: any): boolean {
    const permisoId = Number(permiso.permisoId || permiso.idPermiso || permiso.id);
    const isSectionPermiso = permisoId >= 101 && permisoId <= 108;

    if (nodeId === 'administracion.proveedores.cuestionario') {
      return true;
    } else {
      return !isSectionPermiso;
    }
  }

  /**
   * Checkbox Principal de la Vista (Marca o desmarca todos los sub-permisos)
   */
  onPermissionChange(itemId: string, isChecked: boolean): void {
    if (!this.selectedPermissions) this.selectedPermissions = {};

    if (isChecked) {
      // Si marca la vista, le asignamos solo los permisos visibles para este nodo
      this.selectedPermissions[itemId] = this.permisos
        .filter(p => this.isPermisoVisibleForNode(itemId, p))
        .map(p => Number(p.permisoId || p.idPermiso || p.id));
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