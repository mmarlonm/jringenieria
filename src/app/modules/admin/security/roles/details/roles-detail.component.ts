import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRippleModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDrawerToggleResult } from '@angular/material/sidenav';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { FuseNavigationItem } from '@fuse/components/navigation';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { RolService } from 'app/modules/admin/security/roles/roles.service';
import { RolesListComponent } from 'app/modules/admin/security/roles/list/roles-list.component';
import { RoleNavigationModule } from '../rol-navigation/rol-navigation.module';

@Component({
    selector: 'roles-details',
    templateUrl: './roles-detail.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        CommonModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatTooltipModule,
        RouterLink, MatIconModule, MatRippleModule, MatFormFieldModule, MatInputModule,
        MatCheckboxModule, MatProgressSpinnerModule, RoleNavigationModule
    ],
})
export class RolesDetailsComponent implements OnInit, OnDestroy {

    editMode: boolean = false;
    rol: any;
    contactForm: UntypedFormGroup;
    navigation: FuseNavigationItem[] = [];

    // 🔹 1. CORRECCIÓN: Ahora es un diccionario de arreglos numéricos { 'dashboards.quote': [1, 2, 3] }
    selectedPermissions: { [id: string]: number[] } = {};

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _rolListComponent: RolesListComponent,
        private _rolService: RolService,
        private _formBuilder: UntypedFormBuilder,
        private _fuseConfirmationService: FuseConfirmationService,
        private _router: Router,
        private _activatedRoute: ActivatedRoute
    ) { }

    ngOnInit(): void {
        if (this._rolListComponent.matDrawer) {
            this._rolListComponent.matDrawer.open();
        }

        this.contactForm = this._formBuilder.group({
            rolId: [''],
            nombreRol: ['', [Validators.required]],
        });

        // 1. OBTENER ROL Y MAPEAR PERMISOS
        this._rolService.rol$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((rol: any) => {
                if (!rol) return;
                console.log("JSON DEL ROL DESDE C#:", rol);
                this.rol = rol;
                this.selectedPermissions = {};

                // 🔹 PROCESAR PERMISOS (Soportando la estructura de userInformation proporcionada)

                // 1. Procesar array 'permisos' (Estructura: { permisoId, vista: { nombreVista } })
                if (rol.permisos && Array.isArray(rol.permisos)) {
                    rol.permisos.forEach((p: any) => {
                        const idVista = p.vista?.nombreVista || p.vista?.vistaId || p.nombreVista || p.vistaId;
                        const idPermiso = Number(p.permisoId || p.idPermiso || p.id);

                        if (idVista && !isNaN(idPermiso)) {
                            if (!this.selectedPermissions[idVista]) {
                                this.selectedPermissions[idVista] = [];
                            }
                            if (!this.selectedPermissions[idVista].includes(idPermiso)) {
                                this.selectedPermissions[idVista].push(idPermiso);
                            }
                        }
                    });
                }

                // 2. Procesar array 'vistas' (Estructura: { vistaId, permisos: [...] })
                if (rol.vistas && Array.isArray(rol.vistas)) {
                    rol.vistas.forEach((v: any) => {
                        const idVista = v.nombreVista || v.vistaId || v.idVista;
                        if (!idVista) return;

                        let permisosAsignados: number[] = [];
                        if (v.permisos && Array.isArray(v.permisos)) {
                            permisosAsignados = v.permisos.map((p: any) => {
                                const id = typeof p === 'number' ? p : (p.permisoId || p.idPermiso || p.id);
                                return Number(id);
                            }).filter(id => !isNaN(id));
                        } else if (v.permisoId || v.idPermiso || v.id) {
                            const id = Number(v.permisoId || v.idPermiso || v.id);
                            if (!isNaN(id)) permisosAsignados = [id];
                        }

                        if (!this.selectedPermissions[idVista]) {
                            this.selectedPermissions[idVista] = permisosAsignados;
                        } else {
                            this.selectedPermissions[idVista] = [...new Set([...this.selectedPermissions[idVista], ...permisosAsignados])];
                        }
                    });
                }

                this.contactForm.patchValue({
                    rolId: rol.rolId || rol.id,
                    nombreRol: rol.nombreRol || (rol.roles ? rol.roles[0] : ''),
                });

                this._changeDetectorRef.markForCheck();
            });

        // 2. OBTENER NAVEGACIÓN
        this._rolService.getNavigation()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((nav: any) => {
                this.navigation = nav.default || nav;
                this._changeDetectorRef.markForCheck();
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    closeDrawer(): Promise<MatDrawerToggleResult> {
        return this._rolListComponent.matDrawer.close();
    }

    // 🔹 3. CORRECCIÓN: Recibe la nueva estructura del hijo (Array de objetos)
    // El hijo emite: [ { vistaId: 'dashboard', permisos: [1,2,3] }, ... ]
    actualizarPermisos(eventPayload: any[]): void {
        this.selectedPermissions = {}; // Reiniciamos el estado

        eventPayload.forEach(item => {
            if (item.vistaId && item.permisos) {
                this.selectedPermissions[item.vistaId] = item.permisos;
            }
        });

        this._changeDetectorRef.markForCheck();
    }

    toggleEditMode(editMode: boolean | null = null): void {
        this.editMode = editMode ?? !this.editMode;
        this._changeDetectorRef.markForCheck();
    }

    /**
     * 🔹 4. CORRECCIÓN: Enviar los permisos reales al Backend C#
     */
    updateContact(): void {
        if (this.contactForm.invalid) return;

        // Transformar el diccionario { 'vistaX': [1,2] } al formato del Backend
        const vistasParaBackend = Object.keys(this.selectedPermissions)
            .filter(key => this.selectedPermissions[key] && this.selectedPermissions[key].length > 0)
            .map(key => ({
                vistaId: key,               // Ej: "dashboards.analytics"
                permisos: this.selectedPermissions[key] // Ej: [1, 2, 4]
            }));

        // Construir el Payload final
        const payload = {
            rolId: this.rol.rolId ? parseInt(this.rol.rolId) : 0,
            nombreRol: this.contactForm.get('nombreRol')?.value,
            vistas: vistasParaBackend
        };

        console.log('Enviando a C#:', payload);

        // Enviar
        this._rolService.updateRoles(payload).subscribe(() => {
            this.toggleEditMode(false);
        });
    }

    deleteContact(): void {
        const confirmation = this._fuseConfirmationService.open({
            title: 'Eliminar Rol', message: '¿Confirmar eliminación?',
            actions: { confirm: { label: 'Eliminar', color: 'warn' } }
        });
        confirmation.afterClosed().subscribe((result) => {
            if (result === 'confirmed') {
                this._router.navigate(['../'], { relativeTo: this._activatedRoute });
            }
        });
    }
}