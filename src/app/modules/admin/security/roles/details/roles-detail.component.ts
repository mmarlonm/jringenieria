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

    // Diccionario simple para la UI: { 'dashboards.quote': true }
    selectedPermissions: { [id: string]: boolean } = {};

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
                this.rol = rol;
                this.selectedPermissions = {};

                // Analizar Vistas que vienen del Backend para pintar los Checkboxes
                if (rol.vistas && Array.isArray(rol.vistas)) {
                    rol.vistas.forEach((v: any) => {
                        // El backend te devuelve 'nombreVista', lo usamos como ID
                        if (v.nombreVista) {
                            this.selectedPermissions[v.nombreVista] = true;
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
                console.log('Navegación:', this.navigation);
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

    // Recibe el evento del componente hijo (Solo actualiza el local state)
    actualizarPermisos(event: { [id: string]: boolean }): void {
        this.selectedPermissions = event;
        // No necesitamos actualizar el FormArray aquí, lo haremos al Guardar
        this._changeDetectorRef.markForCheck();
    }

    toggleEditMode(editMode: boolean | null = null): void {
        this.editMode = editMode ?? !this.editMode;
        this._changeDetectorRef.markForCheck();
    }

    /**
     * 🔹 MÉTODO CORREGIDO PARA ENVIAR AL BACKEND C#
     */
    updateContact(): void {
        if (this.contactForm.invalid) return;

        // 1. Obtener IDs que están en TRUE
        const idsSeleccionados = Object.keys(this.selectedPermissions)
            .filter(key => this.selectedPermissions[key] === true);

        // 2. Transformar al formato que pide C# (GuardarRolRequest)
        const vistasParaBackend = idsSeleccionados.map(id => ({
            vistaId: id,       // Ej: "dashboards.analytics"
            permisos: [1]      // ⚠️ HARDCODED: Asumimos permiso ID 1 (Ver) por defecto
        }));

        // 3. Construir el Payload final
        const payload = {
            rolId: this.rol.rolId ? parseInt(this.rol.rolId) : 0, // Asegurar int
            nombreRol: this.contactForm.get('nombreRol')?.value,
            vistas: vistasParaBackend
        };

        console.log('Enviando a C#:', payload); // Debug para que verifiques en consola

        // 4. Enviar
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