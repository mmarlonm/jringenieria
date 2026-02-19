import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { TextFieldModule } from '@angular/cdk/text-field';
import { DatePipe, NgClass, CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    Renderer2,
    TemplateRef,
    ViewChild,
    ViewContainerRef,
    ViewEncapsulation,
} from '@angular/core';
import {
    FormsModule,
    ReactiveFormsModule,
    UntypedFormArray,
    UntypedFormBuilder,
    UntypedFormGroup,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule, MatRippleModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDrawerToggleResult } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FuseFindByKeyPipe } from '@fuse/pipes/find-by-key/find-by-key.pipe';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { UsersListComponent } from 'app/modules/admin/security/users/list/users-list.component';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RolService } from 'app/modules/admin/security/roles/roles.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'users-details',
    templateUrl: './users-detail.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        MatButtonModule,
        MatTooltipModule,
        RouterLink,
        MatIconModule,
        FormsModule,
        ReactiveFormsModule,
        MatRippleModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        NgClass,
        MatSelectModule,
        MatOptionModule,
        MatDatepickerModule,
        TextFieldModule,
        FuseFindByKeyPipe,
        DatePipe,
        CommonModule,
        MatSlideToggleModule
    ],
})
export class UsersDetailsComponent implements OnInit, OnDestroy {
    @ViewChild('avatarFileInput') private _avatarFileInput: ElementRef;

    editMode: boolean = false;
    user: any;
    contactForm: UntypedFormGroup;
    users: any[];
    roles: any[] = [];
    unidades: any[] = []; // 🔹 Catálogo de sucursales

    // 🔹 Catálogo de meses para generar los controles dinámicos
    meses: { id: number, nombre: string }[] = [
        { id: 1, nombre: 'Enero' }, { id: 2, nombre: 'Febrero' }, { id: 3, nombre: 'Marzo' },
        { id: 4, nombre: 'Abril' }, { id: 5, nombre: 'Mayo' }, { id: 6, nombre: 'Junio' },
        { id: 7, nombre: 'Julio' }, { id: 8, nombre: 'Agosto' }, { id: 9, nombre: 'Septiembre' },
        { id: 10, nombre: 'Octubre' }, { id: 11, nombre: 'Noviembre' }, { id: 12, nombre: 'Diciembre' }
    ];

    // 🔹 Variable para visualizar los grupos de metas agrupados por Año en la vista de perfil (No Edit Mode)
    metasAgrupadasVisualizacion: any[] = [];

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _activatedRoute: ActivatedRoute,
        private _changeDetectorRef: ChangeDetectorRef,
        private _usersListComponent: UsersListComponent,
        private _usersService: UsersService,
        private _formBuilder: UntypedFormBuilder,
        private _fuseConfirmationService: FuseConfirmationService,
        private _router: Router,
        private _rolService: RolService,
    ) { }

    // 🔹 Ahora el FormArray 'metasAgrupadas' contendrá un FormGroup por cada Año
    get metasAgrupadasFormArray(): UntypedFormArray {
        return this.contactForm.get('metasAgrupadas') as UntypedFormArray;
    }

    ngOnInit(): void {
        // Cargar Roles
        this._rolService.getRoles().subscribe((roles) => {
            this.roles = roles;
            this._changeDetectorRef.markForCheck();
        });

        // 🔹 Cargar Unidades de Negocio
        this._usersService.getUnidadesNegocio().subscribe((unidades) => {
            this.unidades = unidades;
            this._changeDetectorRef.markForCheck();
        });

        this._usersListComponent.matDrawer.open();

        // 🔹 Inicializar el formulario con la nueva estructura de metas agrupadas
        this.contactForm = this._formBuilder.group({
            usuarioId: [''],
            avatar: [null],
            nombreUsuario: ['', [Validators.required]],
            email: ['', [Validators.required, Validators.email]],
            telefono: ['', [Validators.required]],
            activo: [true, [Validators.required]],
            rolId: ['', [Validators.required]],
            unidadId: [null], // 🔹 Sucursal
            metasAgrupadas: this._formBuilder.array([]) // 🔹 Metas dinámicas agrupadas
        });

        this._usersService.users$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((users: any[]) => {
                this.users = users;
                this._changeDetectorRef.markForCheck();
            });

        this._usersService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: any) => {
                if (!user) return;
                this.user = user;

                // Limpiar metas anteriores
                this.metasAgrupadasFormArray.clear();
                this.metasAgrupadasVisualizacion = [];

                // 🔹 Llenar metas si existen agrupándolas
                if (user.metas && user.metas.length > 0) {
                    this.procesarMetasDesdeBackend(user.metas);
                }

                this.contactForm.patchValue(user);
                this.toggleEditMode(false);
                this._changeDetectorRef.markForCheck();
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // --- 🎯 Gestión de Metas Mensuales ---

    /**
     * Procesa la lista plana del backend y construye los FormGroups por Año
     */
    procesarMetasDesdeBackend(metasPlanas: any[]): void {
        // Agrupar por año
        const metasPorAnio = metasPlanas.reduce((acc, curr) => {
            if (!acc[curr.anio]) acc[curr.anio] = [];
            acc[curr.anio].push(curr);
            return acc;
        }, {} as Record<string, any[]>);

        // Iterar sobre los años encontrados
        Object.keys(metasPorAnio).forEach(anioStr => {
            const anio = parseInt(anioStr, 10);
            const metasDelAnio = metasPorAnio[anio];
            this.addGrupoMetasAnio(anio, metasDelAnio);
        });

        // Actualizar la variable de visualización para la tarjeta del perfil
        this.calcularTotalesVisualizacion();
    }

    /**
     * Añade un nuevo bloque de "Año" con sus 12 meses
     */
    addGrupoMetasAnio(anio: number = new Date().getFullYear(), metasExistentes: any[] = []): void {
        // Validar que el año no exista ya en el FormArray
        const anioYaExiste = this.metasAgrupadasFormArray.controls.some(
            ctrl => ctrl.get('anio')?.value === anio
        );

        if (anioYaExiste) {
            Swal.fire({ icon: 'warning', title: 'Atención', text: `Las metas para el año ${anio} ya están en la lista.` });
            return;
        }

        // Crear el FormArray de los 12 meses
        const mesesFormArray = this._formBuilder.array([]);

        this.meses.forEach(mes => {
            // Buscar si ya había una meta guardada para este mes en la BD
            const metaExistente = metasExistentes.find(m => m.mes === mes.id);

            mesesFormArray.push(this._formBuilder.group({
                metaId: [metaExistente ? metaExistente.metaId : 0],
                mesId: [mes.id],
                nombreMes: [mes.nombre],
                montoMeta: [metaExistente ? metaExistente.montoMeta : 0, [Validators.min(0)]]
            }));
        });

        // Crear el FormGroup principal del Año
        const anioFormGroup = this._formBuilder.group({
            anio: [anio, [Validators.required]],
            meses: mesesFormArray
        });

        // Suscribirse a los cambios de valor para recalcular el total en vivo en el HTML
        anioFormGroup.get('meses')?.valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => {
                this._changeDetectorRef.markForCheck();
            });

        this.metasAgrupadasFormArray.push(anioFormGroup);
        this.calcularTotalesVisualizacion();
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Elimina todo el bloque de metas de un Año específico
     */
    removeGrupoMetasAnio(index: number): void {
        this.metasAgrupadasFormArray.removeAt(index);
        this.calcularTotalesVisualizacion();
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Calcula la suma total de los 12 meses para un bloque de Año específico en tiempo real
     */
    calcularTotalAnual(grupoAnio: UntypedFormGroup): number {
        const meses = grupoAnio.get('meses')?.value as any[];
        if (!meses) return 0;
        return meses.reduce((suma, mes) => suma + (Number(mes.montoMeta) || 0), 0);
    }

    /**
     * Prepara los datos agrupados y sumados para la vista de perfil (cuando no se está editando)
     */
    calcularTotalesVisualizacion(): void {
        const valores = this.metasAgrupadasFormArray.getRawValue();
        this.metasAgrupadasVisualizacion = valores.map((grupo: any) => {
            return {
                anio: grupo.anio,
                total: grupo.meses.reduce((suma: number, m: any) => suma + (Number(m.montoMeta) || 0), 0)
            };
        }).sort((a: any, b: any) => b.anio - a.anio); // Ordenar del más reciente al más antiguo
    }

    // --- Acciones de Formulario ---

    updateContact(): void {
        if (this.contactForm.invalid) {
            Swal.fire({ icon: "error", title: "Opps", text: "Revisa los campos obligatorios." });
            return;
        }

        const userRaw = this.contactForm.getRawValue();

        // 🔹 Aplanar las metas para mandarlas al backend como las espera (Lista de MetaUsuarioDto)
        const metasParaBackend: any[] = [];

        userRaw.metasAgrupadas.forEach((grupo: any) => {
            grupo.meses.forEach((mes: any) => {
                // Solo enviamos los meses que tienen monto mayor a 0 (o que ya existían en BD) para optimizar
                if (Number(mes.montoMeta) > 0 || mes.metaId > 0) {
                    metasParaBackend.push({
                        metaId: mes.metaId,
                        anio: grupo.anio,
                        mes: mes.mesId,
                        montoMeta: Number(mes.montoMeta)
                    });
                }
            });
        });

        const userPayload = {
            ...userRaw,
            metas: metasParaBackend // Reemplazamos la estructura agrupada por la lista plana para la API
        };

        // Borramos la propiedad temporal 'metasAgrupadas' para limpiar el payload
        delete userPayload.metasAgrupadas;

        if (userPayload.avatar && userPayload.avatar.startsWith("data:image")) {
            userPayload.avatar = userPayload.avatar.split(",")[1];
        }

        this._usersService.updateUsers(userPayload).subscribe(() => {
            Swal.fire({ icon: "success", title: "Éxito", text: "Usuario actualizado correctamente", timer: 1500 });
            this.calcularTotalesVisualizacion(); // Refrescar totales en pantalla
            this.toggleEditMode(false);
        });
    }

    // --- Métodos de UI (Intactos) ---

    toggleEditMode(editMode: boolean | null = null): void {
        this.editMode = editMode ?? !this.editMode;
        this._changeDetectorRef.markForCheck();
    }

    uploadAvatar(fileList: FileList): void {
        if (!fileList.length) return;
        const file = fileList[0];
        const reader = new FileReader();
        reader.onload = () => {
            const base64String = reader.result as string;
            this.contactForm.patchValue({ avatar: base64String });
            this.user.avatar = base64String;
            this._changeDetectorRef.markForCheck();
        };
        reader.readAsDataURL(file);
    }

    removeAvatar(): void {
        this.contactForm.get('avatar')?.setValue(null);
        if (this._avatarFileInput) {
            this._avatarFileInput.nativeElement.value = null;
        }
        this.user.avatar = null;
    }

    closeDrawer(): Promise<MatDrawerToggleResult> {
        return this._usersListComponent.matDrawer.close();
    }

    deleteContact(): void {
        const confirmation = this._fuseConfirmationService.open({
            title: 'Delete user',
            message: 'Are you sure you want to delete this user? This action cannot be undone!',
            actions: { confirm: { label: 'Delete' } },
        });

        confirmation.afterClosed().subscribe((result) => {
            if (result === 'confirmed') {
                this._usersService.deleteContact(this.user.usuarioId).subscribe(() => {
                    this._router.navigate(['../'], { relativeTo: this._activatedRoute });
                });
            }
        });
    }

    trackByFn(index: number, item: any): any {
        return item.usuarioId || index;
    }

    navigateToProject(id: number): void {
        this._router.navigate([`/dashboards/project/${id}`]);
    }

    async copyTextToClipboard(text: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Error al copiar: ', err);
        }
    }
}